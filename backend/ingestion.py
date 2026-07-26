import os
import re
import json
import hashlib
import logging
from typing import List, Dict, Optional

import pdfplumber
from rank_bm25 import BM25Okapi

from backend.config import (
    DATA_DIR, EMBEDDING_MODEL, COLLECTION_NAME, EMBEDDING_DIM, ENABLE_PDF_INGESTION,
    ENABLE_PARSE_CACHE, PARSE_CACHE_PATH,
)
from backend.db import (
    clear_chunks_for_document, ensure_document, insert_chunks_bulk,
    initialize_database, set_document_status,
)
from backend.legal_facts import build_builtin_chunks
from backend.models import LegalChunk
from backend.ipc_bns_map import detect_law_type

logger = logging.getLogger(__name__)

# Bump when the parsing logic changes so old caches are invalidated.
_CACHE_VERSION = 2


def _file_signature(filepath: str) -> Dict[str, object]:
    """Content-based signature (size + md5) so a prebuilt cache stays valid across
    machines and deploys. mtime is intentionally NOT used: git/Docker checkouts
    reset file mtimes, which would wrongly invalidate a committed cache and force
    an expensive (memory-heavy) re-parse on hosts like Render."""
    stat = os.stat(filepath)
    md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(block)
    return {"size": stat.st_size, "md5": md5.hexdigest()}


def _load_parse_cache() -> Dict:
    if not ENABLE_PARSE_CACHE or not os.path.exists(PARSE_CACHE_PATH):
        return {"version": _CACHE_VERSION, "files": {}}
    try:
        with open(PARSE_CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if data.get("version") != _CACHE_VERSION:
            return {"version": _CACHE_VERSION, "files": {}}
        return data
    except Exception as exc:
        logger.warning("Parse cache unreadable, rebuilding: %s", exc)
        return {"version": _CACHE_VERSION, "files": {}}


def _save_parse_cache(cache: Dict) -> None:
    if not ENABLE_PARSE_CACHE:
        return
    try:
        os.makedirs(os.path.dirname(PARSE_CACHE_PATH), exist_ok=True)
        tmp_path = f"{PARSE_CACHE_PATH}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(cache, f)
        os.replace(tmp_path, PARSE_CACHE_PATH)
    except Exception as exc:
        logger.warning("Could not write parse cache: %s", exc)


def _chunks_to_cache(chunks: List[LegalChunk]) -> List[Dict]:
    return [c.model_dump() for c in chunks]


def _chunks_from_cache(raw: List[Dict]) -> List[LegalChunk]:
    return [LegalChunk(**item) for item in raw]

SECTION_PATTERN = re.compile(
    r'(?:^|\n)\s*Section\s+(\d+[A-Z]?)\.?\s',
    re.IGNORECASE
)

_tokenized_corpus: List[List[str]] = []
_chunks: List[LegalChunk] = []
_bm25: Optional[BM25Okapi] = None


def _tokenize(text: str) -> List[str]:
    return re.findall(r'\b\w+\b', text.lower())


def _parse_pdf(filepath: str) -> List[LegalChunk]:
    chunks = []
    filename = os.path.basename(filepath)
    try:
        with pdfplumber.open(filepath) as pdf:
            text_parts = []
            page_map = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                text_parts.append(text)
                page_map.extend([i + 1] * (text.count("\n") + 1))
                # Release per-page cached objects so memory doesn't accumulate
                # across a large document (pdfminer caches page layout/fonts).
                page.flush_cache()
                if hasattr(page, "get_textmap"):
                    try:
                        page.get_textmap.cache_clear()
                    except Exception:
                        pass
            full_text = "\n".join(text_parts) + "\n"
            del text_parts

            sections = list(SECTION_PATTERN.finditer(full_text))
            law_type = detect_law_type(full_text)

            if not sections:
                chunks.append(LegalChunk(
                    text=full_text.strip()[:2000],
                    section_number="N/A",
                    law_type=law_type,
                    page_number=1,
                    source_file=filename,
                ))
                return chunks

            for idx, match in enumerate(sections):
                start = match.start()
                end = sections[idx + 1].start() if idx + 1 < len(sections) else len(full_text)
                section_text = full_text[start:end].strip()
                section_num = match.group(1)
                page_num = page_map[min(match.start(), len(page_map) - 1)] if page_map else 1

                if len(section_text) > 50:
                    chunks.append(LegalChunk(
                        text=section_text[:2000],
                        section_number=section_num,
                        law_type=law_type,
                        page_number=page_num,
                        source_file=filename,
                    ))

    except Exception as e:
        logger.warning(f"Failed to parse {filename}: {e}")

    return chunks


def ingest_pdfs(data_dir: Optional[str] = None) -> List[LegalChunk]:
    global _chunks, _tokenized_corpus, _bm25

    if not ENABLE_PDF_INGESTION:
        _chunks = build_builtin_chunks()
        _tokenized_corpus = [_tokenize(c.text) for c in _chunks]
        _bm25 = BM25Okapi(_tokenized_corpus) if _tokenized_corpus else None
        logger.info(f"Loaded {len(_chunks)} built-in legal reference chunks.")
        return _chunks

    directory = data_dir or DATA_DIR
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
        logger.warning(f"Created empty data directory: {directory}")
        _chunks = build_builtin_chunks()
        _tokenized_corpus = [_tokenize(c.text) for c in _chunks]
        _bm25 = BM25Okapi(_tokenized_corpus) if _tokenized_corpus else None
        return _chunks

    pdf_files = [f for f in os.listdir(directory) if f.lower().endswith(".pdf")]
    if not pdf_files:
        logger.warning(f"No PDF files found in {directory}")
        _chunks = build_builtin_chunks()
        _tokenized_corpus = [_tokenize(c.text) for c in _chunks]
        _bm25 = BM25Okapi(_tokenized_corpus) if _tokenized_corpus else None
        return _chunks

    cache = _load_parse_cache()
    cached_files: Dict = cache.get("files", {})
    all_chunks: List[LegalChunk] = []
    parsed_files: List[str] = []  # files (re)parsed this run -> need DB write
    cache_dirty = False

    for pdf_file in pdf_files:
        filepath = os.path.join(directory, pdf_file)
        try:
            signature = _file_signature(filepath)
        except OSError as exc:
            logger.warning("Could not stat %s: %s", pdf_file, exc)
            signature = None

        entry = cached_files.get(pdf_file)
        if entry and signature and entry.get("signature") == signature:
            # Unchanged file: reuse previously parsed chunks, skip pdfplumber + DB.
            chunks = _chunks_from_cache(entry.get("chunks", []))
            all_chunks.extend(chunks)
            continue

        logger.info(f"Parsing: {pdf_file}")
        chunks = _parse_pdf(filepath)
        logger.info(f"  Extracted {len(chunks)} sections from {pdf_file}")
        all_chunks.extend(chunks)
        parsed_files.append(pdf_file)

        if signature is not None:
            cached_files[pdf_file] = {
                "signature": signature,
                "chunks": _chunks_to_cache(chunks),
            }
            cache_dirty = True

    # Drop cache entries for PDFs that no longer exist.
    removed = set(cached_files) - set(pdf_files)
    for stale in removed:
        cached_files.pop(stale, None)
        cache_dirty = True

    if cache_dirty:
        cache["files"] = cached_files
        _save_parse_cache(cache)

    # Only write metadata to the (possibly remote) database for files that were
    # actually re-parsed. A fully warm start performs zero DB round-trips here.
    if parsed_files:
        try:
            initialize_database()
        except Exception as exc:
            logger.warning("Database schema initialization skipped during ingestion: %s", exc)

        for pdf_file in parsed_files:
            filepath = os.path.join(directory, pdf_file)
            file_chunks = [c for c in all_chunks if c.source_file == pdf_file]
            if not file_chunks:
                continue
            try:
                doc_id = ensure_document(
                    filename=pdf_file,
                    file_path=filepath,
                    law_type=file_chunks[0].law_type,
                    status="processed",
                )
                clear_chunks_for_document(doc_id)
                insert_chunks_bulk(
                    doc_id,
                    ((c.section_number, c.page_number, c.text) for c in file_chunks),
                )
                set_document_status(doc_id, "processed")
            except Exception as exc:
                logger.warning("Skipping database metadata write for %s: %s", pdf_file, exc)

    _chunks = all_chunks
    _tokenized_corpus = [_tokenize(c.text) for c in _chunks]
    if _tokenized_corpus:
        _bm25 = BM25Okapi(_tokenized_corpus)
    elif not _chunks:
        _chunks = build_builtin_chunks()
        _tokenized_corpus = [_tokenize(c.text) for c in _chunks]
        _bm25 = BM25Okapi(_tokenized_corpus) if _tokenized_corpus else None

    logger.info(f"Total chunks: {len(_chunks)}")
    return _chunks


def get_chunks() -> List[LegalChunk]:
    return _chunks


def get_bm25_index() -> Optional[BM25Okapi]:
    return _bm25


def get_tokenized_corpus() -> List[List[str]]:
    return _tokenized_corpus
