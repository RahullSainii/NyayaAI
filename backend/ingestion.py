import os
import re
import logging
from typing import List, Dict, Optional

import pdfplumber
from rank_bm25 import BM25Okapi

from backend.config import (
    DATA_DIR, EMBEDDING_MODEL, COLLECTION_NAME, EMBEDDING_DIM, ENABLE_PDF_INGESTION
)
from backend.db import clear_chunks_for_document, ensure_document, insert_chunk, initialize_database, set_document_status
from backend.legal_facts import build_builtin_chunks
from backend.models import LegalChunk
from backend.ipc_bns_map import detect_law_type

logger = logging.getLogger(__name__)

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
            full_text = ""
            page_map = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                full_text += text + "\n"
                page_map.extend([i + 1] * (text.count("\n") + 1))

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

    all_chunks = []
    try:
        initialize_database()
    except Exception as exc:
        logger.warning("SQLite schema initialization skipped during ingestion: %s", exc)

    for pdf_file in pdf_files:
        filepath = os.path.join(directory, pdf_file)
        logger.info(f"Parsing: {pdf_file}")
        chunks = _parse_pdf(filepath)
        logger.info(f"  Extracted {len(chunks)} sections from {pdf_file}")
        all_chunks.extend(chunks)

        try:
            if chunks:
                doc_id = ensure_document(
                    filename=pdf_file,
                    file_path=filepath,
                    law_type=chunks[0].law_type,
                    status="processed",
                )
                clear_chunks_for_document(doc_id)
                for chunk in chunks:
                    insert_chunk(
                        document_id=doc_id,
                        section_number=chunk.section_number,
                        page_number=chunk.page_number,
                        chunk_text=chunk.text,
                    )
                set_document_status(doc_id, "processed")
        except Exception as exc:
            logger.warning("Skipping SQLite metadata write for %s: %s", pdf_file, exc)

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
