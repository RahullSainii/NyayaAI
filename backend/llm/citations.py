"""Citation builders and refusal detection for LLM responses."""

import re
from typing import Dict, List

from backend.llm.client import complete
from backend.llm.prompts import QUERY_REWRITE_SYSTEM, history_messages


# ── Citations ───────────────────────────────────────────────────────────

def build_citations(chunks: List[Dict]) -> List[Dict]:
    """Build citation objects from knowledge-base chunks."""
    citations = []
    for chunk in chunks:
        citations.append({
            "section": chunk.get("section_number", "N/A"),
            "law_type": chunk.get("law_type", "IPC"),
            "text_snippet": chunk.get("text", "")[:200],
            "page_number": chunk.get("page_number", 0),
        })
    return citations


def build_web_citations(results: List[Dict]) -> List[Dict]:
    """Build citation objects from web search results."""
    citations = []
    for r in results:
        citations.append({
            "section": r.get("title", "Web result")[:80] or "Web result",
            "law_type": "WEB",
            "text_snippet": r.get("snippet", "")[:200],
            "page_number": 0,
            "url": r.get("url", ""),
        })
    return citations


# ── Refusal detection ───────────────────────────────────────────────────

_REFUSAL_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in (
        r"knowledge base\b.{0,40}?\b(?:does not|doesn't|do not|don't)\s+(?:contain|have|include|provide|cover|list)",
        r"context\b.{0,30}?\b(?:does not|doesn't|do not)\s+(?:contain|include|provide|cover|mention)",
        r"does not contain (?:a |any |the )?(?:list|information|provision|provisions|details?|specific|named)",
        r"doesn't contain (?:a |any |the )?(?:list|information|provision|provisions|details?|specific|named)",
        r"do(?:es)? not (?:have|include|mention|cover|list)\b.{0,30}?(?:information|details?|cases?|provision|specific)",
        r"no (?:provisions?|information|details?|specific|named cases?|relevant)\b.{0,20}?(?:related|found|available|on this)",
        r"doesn't have detailed information",
        r"couldn't find this topic",
        r"cannot provide information",
        r"no relevant legal sections",
        r"(?:is|are) not (?:available|present) in (?:the |our )?knowledge base",
        r"not (?:covered|found|present|available) in (?:the |our )?(?:knowledge base|provided context)",
    )
]


def looks_like_refusal(text: str) -> bool:
    """True if an answer indicates the knowledge base couldn't address the query."""
    lowered = (text or "").lower()
    return any(pattern.search(lowered) for pattern in _REFUSAL_PATTERNS)


# ── Query rewriting ─────────────────────────────────────────────────────

async def rewrite_search_query(
    query: str, history: List[Dict] | None = None
) -> str:
    """Rewrite a question into a focused Indian-law web search query.

    Falls back to the original query if the LLM is unavailable.
    """
    convo = ""
    hist = history_messages(history, limit=4)
    if hist:
        convo = "\n".join(f"{m['role']}: {m['content'][:300]}" for m in hist)

    user = (
        (f"Earlier conversation:\n{convo}\n\n" if convo else "")
        + f"Question: {query}\n\nSearch query:"
    )
    messages = [
        {"role": "system", "content": QUERY_REWRITE_SYSTEM},
        {"role": "user", "content": user},
    ]
    try:
        rewritten = await complete(messages, max_tokens=40)
    except Exception:
        rewritten = ""

    rewritten = (
        (rewritten or "").strip().strip('"').splitlines()[0].strip()
        if rewritten
        else ""
    )
    if len(rewritten) < 4:
        return query
    return rewritten[:200]
