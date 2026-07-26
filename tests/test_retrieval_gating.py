"""Tests for relevance gating: term coverage, rerank-score floor, and the
out-of-scope decision in ``retrieve``. These lock in the behavior that prevents
NyayaAI from answering (or citing) material that doesn't match the question.
"""

import pytest

from backend import retriever
from backend.retriever import (
    _meaningful_terms, _term_coverage, _relevance_coverage, get_confidence,
)


def _chunk(text, score=0.9, section="1", law="IPC"):
    return {
        "text": text,
        "section_number": section,
        "law_type": law,
        "page_number": 1,
        "score": score,
    }


# --- _meaningful_terms -----------------------------------------------------

def test_meaningful_terms_strips_stopwords_and_filler():
    terms = _meaningful_terms("what is the Hindu Marriage Act and you explain it")
    assert "hindu" in terms
    assert "marriage" in terms
    # stopwords / domain filler removed
    for junk in ("what", "the", "act", "you", "explain", "it", "is", "and"):
        assert junk not in terms


def test_meaningful_terms_keeps_topic_words_from_out_of_scope_query():
    terms = _meaningful_terms("but is triple Talaq bill when was it implemented and revoked explain")
    assert "triple" in terms
    assert "talaq" in terms
    assert "revoked" in terms
    assert "bill" not in terms  # 'bill' is treated as filler


# --- _term_coverage --------------------------------------------------------

def test_term_coverage_full_when_terms_present():
    chunks = [_chunk("The Hindu Marriage Act governs marriage among Hindus.")]
    assert _term_coverage("Hindu Marriage Act", chunks) == pytest.approx(1.0)


def test_term_coverage_zero_when_topic_absent():
    # Retrieved context is about unrelated IPC sections; Triple Talaq terms absent.
    chunks = [_chunk("Section 26 IPC deals with reason to believe. Section 115 abetment.")]
    assert _term_coverage("triple talaq revoked implemented", chunks) == 0.0


def test_term_coverage_partial():
    chunks = [_chunk("Consumer protection covers unfair trade practices.")]
    # 'consumer' present, 'insolvency' absent -> 0.5
    assert _term_coverage("consumer insolvency", chunks) == pytest.approx(0.5)


def test_term_coverage_no_meaningful_terms_is_not_penalized():
    assert _term_coverage("what is it", [_chunk("anything")]) == pytest.approx(1.0)


# --- _relevance_coverage (IDF-weighted) ------------------------------------

class _FakeBM25:
    """Minimal stand-in exposing an .idf mapping like rank_bm25's BM25Okapi."""
    def __init__(self, idf):
        self.idf = idf


def test_relevance_coverage_downweights_generic_matches(monkeypatch):
    # Corpus IDF: generic words are common (low IDF); 'talaq' is absent entirely.
    fake = _FakeBM25({
        "person": 0.4, "married": 0.6, "punishments": 0.8, "times": 0.5,
        "triple": 2.0, "allegedly": 3.0,  # 'talaq' intentionally missing
    })
    monkeypatch.setattr(retriever, "get_bm25_index", lambda: fake)

    # Retrieved context has the generic words but NOT the defining term 'talaq'.
    chunks = [_chunk("A person who married; punishments apply several times.")]
    query = "triple talaq punishments for a person who allegedly married times"

    coverage = _relevance_coverage(query, chunks)
    # The missing high-IDF terms ('talaq' absent, 'allegedly'/'triple' unmatched)
    # dominate, so weighted coverage stays low despite generic-word matches.
    assert coverage < retriever.MIN_TERM_COVERAGE


def test_relevance_coverage_high_when_defining_terms_present(monkeypatch):
    fake = _FakeBM25({"hindu": 2.5, "marriage": 2.0, "divorce": 1.8})
    monkeypatch.setattr(retriever, "get_bm25_index", lambda: fake)

    chunks = [_chunk("The Hindu Marriage Act governs marriage and divorce among Hindus.")]
    coverage = _relevance_coverage("Hindu marriage divorce", chunks)
    assert coverage == pytest.approx(1.0)


def test_relevance_coverage_falls_back_without_idf(monkeypatch):
    monkeypatch.setattr(retriever, "get_bm25_index", lambda: None)
    chunks = [_chunk("consumer protection unfair trade")]
    # 'consumer' present, 'insolvency' absent -> 0.5 plain coverage
    assert _relevance_coverage("consumer insolvency", chunks) == pytest.approx(0.5)


# --- get_confidence --------------------------------------------------------

@pytest.mark.parametrize("score,expected", [
    (0.95, "HIGH"),
    (0.6, "MEDIUM"),
    (0.2, "LOW"),
])
def test_get_confidence_bands(score, expected):
    assert get_confidence(score) == expected


# --- retrieve gating (with monkeypatched retrieval internals) --------------

@pytest.mark.asyncio
async def test_retrieve_flags_out_of_scope_query(monkeypatch):
    async def fake_ready():
        return None

    async def fake_hybrid(query, law_filter="ALL"):
        # Simulate irrelevant chunks being returned for a query we don't cover.
        return [_chunk("Section 26 IPC reason to believe.", score=0.7)]

    monkeypatch.setattr(retriever, "ensure_ready", fake_ready)
    monkeypatch.setattr(retriever, "hybrid_search", fake_hybrid)

    chunks, confidence = await retriever.retrieve("triple talaq revoked implemented")
    assert chunks == []
    assert confidence == "LOW"


@pytest.mark.asyncio
async def test_retrieve_keeps_relevant_query(monkeypatch):
    async def fake_ready():
        return None

    async def fake_hybrid(query, law_filter="ALL"):
        return [_chunk("The Hindu Marriage Act governs marriage among Hindus.", score=0.7)]

    monkeypatch.setattr(retriever, "ensure_ready", fake_ready)
    monkeypatch.setattr(retriever, "hybrid_search", fake_hybrid)

    chunks, confidence = await retriever.retrieve("Hindu Marriage Act")
    assert len(chunks) == 1
    assert confidence in {"LOW", "MEDIUM", "HIGH"}
    assert confidence != "LOW"  # relevant + score 0.7 -> MEDIUM


@pytest.mark.asyncio
async def test_retrieve_drops_chunks_below_score_floor(monkeypatch):
    async def fake_ready():
        return None

    async def fake_hybrid(query, law_filter="ALL"):
        return [
            _chunk("Hindu Marriage Act relevant text.", score=0.9),
            _chunk("Weak barely-related text about marriage.", score=0.1),
        ]

    monkeypatch.setattr(retriever, "ensure_ready", fake_ready)
    monkeypatch.setattr(retriever, "hybrid_search", fake_hybrid)

    chunks, _ = await retriever.retrieve("Hindu Marriage Act")
    # The 0.1-scored chunk is below RERANK_SCORE_FLOOR (0.3) and should be dropped.
    assert all(c["score"] >= retriever.RERANK_SCORE_FLOOR for c in chunks)
    assert len(chunks) == 1
