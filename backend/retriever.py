import asyncio
import logging
import re
from typing import List, Dict, Optional, Tuple

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, VectorParams, Distance, PointStruct

from backend.config import (
    QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME, ENABLE_VECTOR_MODELS,
    EMBEDDING_MODEL, EMBEDDING_DIM, RERANKER_MODEL,
    BM25_WEIGHT, SEMANTIC_WEIGHT, TOP_K_MERGED, TOP_K_RERANKED,
    RERANK_SCORE_FLOOR, MIN_TERM_COVERAGE,
)
from backend.models import LegalChunk
from backend.ingestion import get_chunks, get_bm25_index, get_tokenized_corpus

logger = logging.getLogger(__name__)

_embedder: Optional[object] = None
_reranker: Optional[object] = None
_qdrant_client: Optional[AsyncQdrantClient] = None
_is_indexed: bool = False
_bootstrap_lock: Optional[asyncio.Lock] = None
_model_load_failed: bool = False
_model_load_error: Optional[str] = None


async def _get_qdrant() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        if QDRANT_API_KEY:
            _qdrant_client = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            _qdrant_client = AsyncQdrantClient(url=QDRANT_URL)
    return _qdrant_client


def load_models() -> None:
    global _embedder, _reranker, _model_load_failed, _model_load_error
    if _embedder is not None:  # Already loaded
        return

    if _model_load_failed:
        return

    if not ENABLE_VECTOR_MODELS:
        _model_load_failed = True
        _model_load_error = "Vector models disabled"
        logger.info("Vector models are disabled; using BM25-only retrieval.")
        return

    try:
        logger.info("Loading embedding model (first time, may take a minute)...")
        from sentence_transformers import SentenceTransformer, CrossEncoder

        _embedder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Loading reranker model...")
        _reranker = CrossEncoder(RERANKER_MODEL, max_length=512)
        logger.info("Models loaded successfully.")
    except Exception as exc:
        _embedder = None
        _reranker = None
        _model_load_failed = True
        _model_load_error = str(exc)
        logger.warning("Model loading unavailable, falling back to local retrieval: %s", exc)


async def ensure_ready() -> None:
    """Load models and index the local PDF corpus once per process."""
    global _bootstrap_lock, _is_indexed

    if _bootstrap_lock is None:
        _bootstrap_lock = asyncio.Lock()

    if _is_indexed and get_chunks():
        if _embedder is None or _reranker is None:
            load_models()
        return

    async with _bootstrap_lock:
        if _is_indexed and get_chunks():
            if _embedder is None and not _model_load_failed:
                load_models()
            return

        chunks = get_chunks()
        if not chunks:
            from backend.ingestion import ingest_pdfs

            chunks = ingest_pdfs()

        if chunks and not _model_load_failed:
            try:
                load_models()
                if _embedder is not None:
                    await index_chunks_to_qdrant(chunks)
            except Exception as exc:
                logger.warning("Vector indexing skipped: %s", exc)

        _is_indexed = True


def embed_text(text: str) -> Optional[List[float]]:
    global _embedder
    if _embedder is None:
        load_models()
    if _embedder is None:
        return None
    try:
        embedding = _embedder.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as exc:
        logger.warning("Embedding unavailable, skipping semantic search: %s", exc)
        return None


async def index_chunks_to_qdrant(chunks: List[LegalChunk]) -> None:
    global _is_indexed
    if _embedder is None:
        load_models()
    if _embedder is None:
        logger.info("Skipping Qdrant indexing because embedding model is unavailable.")
        _is_indexed = True
        return

    try:
        client = await _get_qdrant()
    except Exception as exc:
        logger.warning("Skipping Qdrant indexing because the client is unavailable: %s", exc)
        _is_indexed = True
        return

    try:
        collections = await client.get_collections()
        existing = [c.name for c in collections.collections]
        if COLLECTION_NAME in existing:
            await client.delete_collection(COLLECTION_NAME)

        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )

        if not chunks:
            _is_indexed = True
            return

        batch_size = 32
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.text for c in batch]
            embeddings = _embedder.encode(texts, normalize_embeddings=True)

            points = []
            for j, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                points.append(PointStruct(
                    id=i + j,
                    vector=embedding.tolist(),
                    payload={
                        "text": chunk.text,
                        "section_number": chunk.section_number,
                        "law_type": chunk.law_type,
                        "page_number": chunk.page_number,
                        "source_file": chunk.source_file,
                    },
                ))

            await client.upsert(collection_name=COLLECTION_NAME, points=points)

        _is_indexed = True
        logger.info(f"Indexed {len(chunks)} chunks to Qdrant.")
    except Exception as exc:
        logger.warning("Qdrant indexing failed, continuing with local retrieval only: %s", exc)
        _is_indexed = True


def _normalize_scores(scores: List[float]) -> List[float]:
    if not scores:
        return []
    min_s = min(scores)
    max_s = max(scores)
    rng = max_s - min_s
    if rng < 1e-9:
        return [0.5] * len(scores)
    return [(s - min_s) / rng for s in scores]


def _bm25_search(query: str, top_k: int = 20) -> List[Tuple[int, float]]:
    bm25 = get_bm25_index()
    if bm25 is None:
        return []
    tokens = re.findall(r'\b\w+\b', query.lower())
    scores = bm25.get_scores(tokens)
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]


async def _semantic_search(query: str, top_k: int = 20, law_filter: str = "ALL") -> List[Tuple[int, float]]:
    query_vec = embed_text(query)
    if not query_vec:
        return []

    try:
        client = await _get_qdrant()
    except Exception as exc:
        logger.warning("Semantic search skipped because Qdrant is unavailable: %s", exc)
        return []

    query_filter = None
    if law_filter and law_filter != "ALL":
        query_filter = Filter(must=[
            FieldCondition(key="law_type", match=MatchValue(value=law_filter))
        ])

    try:
        results = await client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vec,
            query_filter=query_filter,
            limit=top_k,
        )
        return [(r.id, r.score) for r in results.points]
    except Exception as exc:
        logger.warning("Semantic search failed, using BM25 only: %s", exc)
        return []


async def hybrid_search(query: str, law_filter: str = "ALL") -> List[Dict]:
    chunks = get_chunks()
    if not chunks:
        return []

    bm25_results = _bm25_search(query, TOP_K_MERGED * 2)
    semantic_results = await _semantic_search(query, TOP_K_MERGED * 2, law_filter)

    bm25_dict = {idx: score for idx, score in bm25_results}
    semantic_dict = {idx: score for idx, score in semantic_results}

    all_indices = []
    for idx, _ in bm25_results + semantic_results:
        if idx not in all_indices:
            all_indices.append(idx)

    bm25_scores = [bm25_dict.get(i, 0.0) for i in all_indices]
    semantic_scores = [semantic_dict.get(i, 0.0) for i in all_indices]

    bm25_norm = _normalize_scores(bm25_scores)
    semantic_norm = _normalize_scores(semantic_scores)

    merged = []
    for idx, b_score, s_score, raw_b, raw_s in zip(
        all_indices, bm25_norm, semantic_norm, bm25_scores, semantic_scores
    ):
        combined = BM25_WEIGHT * b_score + SEMANTIC_WEIGHT * s_score
        if idx < len(chunks):
            chunk = chunks[idx]
            merged.append({
                "text": chunk.text,
                "section_number": chunk.section_number,
                "law_type": chunk.law_type,
                "page_number": chunk.page_number,
                "score": combined,
                "bm25_score": b_score,
                "semantic_score": s_score,
                "raw_bm25_score": raw_b,
                "raw_semantic_score": raw_s,
            })

    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged[:TOP_K_MERGED]


def rerank(query: str, candidates: List[Dict], top_k: int = TOP_K_RERANKED) -> Tuple[List[Dict], float]:
    if not candidates:
        return [], 0.0

    if _reranker is None:
        ranked = sorted(candidates, key=lambda x: x.get("score", 0.0), reverse=True)
        top_score = ranked[0].get("score", 0.0) if ranked else 0.0
        return ranked[:top_k], float(top_score)

    pairs = [(query, c["text"][:512]) for c in candidates]
    try:
        scores = _reranker.predict(pairs)
    except Exception as exc:
        logger.warning("Reranker failed, using merged scores: %s", exc)
        ranked = sorted(candidates, key=lambda x: x.get("score", 0.0), reverse=True)
        top_score = ranked[0].get("score", 0.0) if ranked else 0.0
        return ranked[:top_k], float(top_score)

    for c, s in zip(candidates, scores):
        c["rerank_score"] = float(s)

    ranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
    top_score = ranked[0]["rerank_score"] if ranked else 0.0
    return ranked[:top_k], top_score


def get_confidence(score: float) -> str:
    if score >= 0.8:
        return "HIGH"
    elif score >= 0.5:
        return "MEDIUM"
    return "LOW"


# Very common words that carry no topical signal. Kept small on purpose: the
# goal is only to strip filler so term-coverage reflects the legal subject.
_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does",
    "explain", "for", "from", "how", "i", "in", "is", "it", "its", "me", "my",
    "of", "on", "or", "please", "the", "to", "was", "were", "what", "when",
    "where", "which", "who", "why", "with", "you", "your", "about", "tell",
    "give", "need", "want", "law", "legal", "act", "bill", "section", "india",
    "indian",
}


def _meaningful_terms(query: str) -> List[str]:
    tokens = re.findall(r"\b\w+\b", query.lower())
    return [t for t in tokens if len(t) > 2 and t not in _STOPWORDS]


def _term_coverage(query: str, chunks: List[Dict]) -> float:
    """Fraction of meaningful query terms that appear in the retrieved context.

    This is corpus-independent and works even in BM25-only mode (where the
    combined score is min-max normalized and therefore not a reliable absolute
    relevance signal). A question about a law we do not hold (e.g. Triple Talaq)
    yields near-zero coverage, letting us flag it as out of scope.
    """
    terms = _meaningful_terms(query)
    if not terms:
        return 1.0  # nothing topical to match on; don't penalize
    haystack = " ".join(c.get("text", "") for c in chunks).lower()
    hits = sum(1 for t in set(terms) if t in haystack)
    return hits / len(set(terms))


def _relevance_coverage(query: str, chunks: List[Dict]) -> float:
    """IDF-weighted term coverage: how much of the query's *distinctive* meaning
    is actually present in the retrieved context.

    Plain coverage treats every query word equally, so a question like
    "triple talaq punishments for a person who married 6 times" passes the gate
    just because generic words ("person", "married", "punishment") exist in the
    penal code -- even though the defining term "talaq" appears nowhere in the
    corpus. Weighting each term by its BM25 IDF fixes this: rare/defining terms
    dominate, and a term absent from the entire corpus vocabulary (the strongest
    out-of-scope signal) is weighted highest while never matching.
    """
    terms = list(set(_meaningful_terms(query)))
    if not terms:
        return 1.0

    haystack = " ".join(c.get("text", "") for c in chunks).lower()

    bm25 = get_bm25_index()
    idf = getattr(bm25, "idf", None)
    if not idf:
        # No IDF available (e.g. vector-only mode) -> plain coverage.
        hits = sum(1 for t in terms if t in haystack)
        return hits / len(terms)

    # A term missing from the whole corpus is maximally distinctive/important.
    max_idf = max(idf.values())
    absent_weight = max(max_idf, 1.0) * 1.5

    matched_weight = 0.0
    total_weight = 0.0
    for t in terms:
        weight = idf.get(t, absent_weight)
        if weight <= 0:
            weight = 0.01  # BM25 epsilon-corrected terms can be ~0; keep a floor
        total_weight += weight
        if t in haystack:
            matched_weight += weight

    return matched_weight / total_weight if total_weight else 1.0


async def retrieve(query: str, law_filter: str = "ALL") -> Tuple[List[Dict], str]:
    try:
        await ensure_ready()
        candidates = await hybrid_search(query, law_filter)
        if not candidates:
            return [], "LOW"

        reranked, top_score = rerank(query, candidates)

        # Drop chunks that scored below the relevance floor so weak, off-topic
        # material never reaches the LLM or gets shown as a citation.
        score_key = "rerank_score" if reranked and "rerank_score" in reranked[0] else "score"
        filtered = [c for c in reranked if c.get(score_key, 0.0) >= RERANK_SCORE_FLOOR]
        if not filtered:
            filtered = reranked[:1]  # keep the single best for confidence checks

        # Out-of-scope detection: if the retrieved context barely shares the
        # question's *distinctive* (rare) terms, treat it as unanswerable rather
        # than answering from irrelevant sections. IDF weighting prevents generic
        # words from masking a missing subject term (e.g. "talaq").
        coverage = _relevance_coverage(query, filtered)
        if coverage < MIN_TERM_COVERAGE:
            logger.info(
                "Query treated as out-of-scope (term coverage %.2f < %.2f): %s",
                coverage, MIN_TERM_COVERAGE, query,
            )
            return [], "LOW"

        confidence = get_confidence(top_score)
        return filtered, confidence
    except Exception as exc:
        logger.warning("Retrieval failed, returning empty context: %s", exc)
        return [], "LOW"
