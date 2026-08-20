"""Web search fallback for questions the local legal knowledge base can't answer.

The module exposes a single ``web_search`` coroutine that returns a normalized
list of results ``[{"title", "url", "snippet"}]``. Providers are attempted in
priority order based on which API keys are configured:

1. Tavily  (TAVILY_API_KEY)   - built for LLM grounding, returns clean content
2. Serper  (SERPER_API_KEY)   - Google Search results
3. DuckDuckGo HTML (keyless)  - best-effort fallback, no key required

Every provider is wrapped in defensive error handling so a failure degrades to
an empty result set rather than breaking the chat request.
"""

from __future__ import annotations

import logging
import re
from html import unescape
from typing import Dict, List
from urllib.parse import unquote

import httpx

from backend.config import (
    ENABLE_WEB_SEARCH,
    SERPER_API_KEY,
    TAVILY_API_KEY,
    WEB_SEARCH_MAX_RESULTS,
)

logger = logging.getLogger(__name__)

import time as _time

# Simple in-memory TTL cache for web search results.
_cache: dict[str, tuple[float, list]] = {}
_CACHE_TTL = 300  # 5 minutes
_CACHE_MAX = 128

def _cache_get(key: str) -> list | None:
    entry = _cache.get(key)
    if entry and (_time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    _cache.pop(key, None)
    return None

def _cache_set(key: str, value: list) -> None:
    # Evict oldest entries if cache is full.
    if len(_cache) >= _CACHE_MAX:
        oldest = min(_cache, key=lambda k: _cache[k][0])
        _cache.pop(oldest, None)
    _cache[key] = (_time.time(), value)

_TIMEOUT = 15.0

# Low-quality sources for legal questions: forums, Q&A sites, study/flashcard
# sites. These are downranked hard (and excluded at the provider when possible).
_JUNK_DOMAINS = (
    "quizlet.com", "brainly.com", "brainly.in", "chegg.com", "coursehero.com",
    "scribd.com", "reddit.com", "quora.com", "answers.com", "studocu.com",
    "cram.com", "flashcard", "slideshare.net", "pinterest.com", "facebook.com",
    "youtube.com", "tiktok.com", "instagram.com",
)

# Authoritative Indian legal sources, surfaced first when present.
_PREFERRED_DOMAINS = (
    "indiankanoon.org", "barandbench.com", "livelaw.in", "scconline.com",
    "indiacode.nic.in", "prsindia.org", "legislative.gov.in", "lawmin.gov.in",
    "india.gov.in", "gov.in", "supremecourtofindia.nic.in", "main.sci.gov.in",
    "taxguru.in", "vakilsearch.com", "ipleaders.in", "lawrato.com",
    "clearias.com", "drishtiias.com", "en.wikipedia.org",
)


def _clean(text: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def _domain(url: str) -> str:
    m = re.search(r"https?://([^/]+)", url or "")
    return (m.group(1) if m else "").lower().replace("www.", "")


def _is_junk(url: str) -> bool:
    d = _domain(url)
    return any(j in d for j in _JUNK_DOMAINS)


def _rank_and_filter(results: List[Dict], max_results: int) -> List[Dict]:
    """Drop junk domains and float authoritative Indian legal sources to the top."""
    filtered = [r for r in results if not _is_junk(r.get("url", ""))]
    # If filtering removed everything, keep the originals rather than returning empty.
    pool = filtered or results

    def rank(r: Dict) -> int:
        d = _domain(r.get("url", ""))
        for i, pref in enumerate(_PREFERRED_DOMAINS):
            if pref in d:
                return i
        return len(_PREFERRED_DOMAINS) + 1

    pool = sorted(pool, key=rank)
    return pool[:max_results]


async def _tavily(query: str, max_results: int) -> List[Dict]:
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "advanced",
        "max_results": max(max_results, 8),
        "exclude_domains": list(_JUNK_DOMAINS),
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post("https://api.tavily.com/search", json=payload)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("results", []):
        results.append({
            "title": _clean(item.get("title", "")),
            "url": item.get("url", ""),
            "snippet": _clean(item.get("content", "")),
        })
    return results


async def _serper(query: str, max_results: int) -> List[Dict]:
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            "https://google.serper.dev/search",
            headers=headers,
            json={"q": query, "num": max(max_results, 10), "gl": "in"},
        )
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("organic", []):
        results.append({
            "title": _clean(item.get("title", "")),
            "url": item.get("link", ""),
            "snippet": _clean(item.get("snippet", "")),
        })
    return results


_DDG_BLOCK = re.compile(
    r'<a[^>]+class="result__a"[^>]+href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>'
    r'.*?class="result__snippet"[^>]*>(?P<snippet>.*?)</a>',
    re.DOTALL,
)


def _ddg_real_url(href: str) -> str:
    # DuckDuckGo wraps result links as /l/?uddg=<encoded-target-url>
    match = re.search(r"[?&]uddg=([^&]+)", href)
    if match:
        return unquote(match.group(1))
    return href


async def _duckduckgo(query: str, max_results: int) -> List[Dict]:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; NyayaAI/1.0)"}
    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=headers, follow_redirects=True) as client:
        resp = await client.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
        )
        resp.raise_for_status()
        html = resp.text

    results = []
    for match in _DDG_BLOCK.finditer(html):
        results.append({
            "title": _clean(match.group("title")),
            "url": _ddg_real_url(match.group("url")),
            "snippet": _clean(match.group("snippet")),
        })
        if len(results) >= max_results:
            break
    return results


async def web_search(query: str, max_results: int | None = None) -> List[Dict]:
    """Return normalized web results, or an empty list if search is unavailable."""
    if not ENABLE_WEB_SEARCH or not query.strip():
        return []

    limit = max_results or WEB_SEARCH_MAX_RESULTS
    cache_key = f"{query.strip().lower()}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.info("Web search cache hit for: %s", query[:80])
        return cached

    providers = []
    if TAVILY_API_KEY:
        providers.append(("tavily", _tavily))
    if SERPER_API_KEY:
        providers.append(("serper", _serper))
    providers.append(("duckduckgo", _duckduckgo))

    for name, provider in providers:
        try:
            results = await provider(query, limit)
            results = [r for r in results if r.get("url") and r.get("snippet")]
            if results:
                ranked = _rank_and_filter(results, limit)
                logger.info(
                    "Web search via %s: %d raw -> %d ranked result(s).",
                    name, len(results), len(ranked),
                )
                _cache_set(cache_key, ranked)
                return ranked
            logger.info("Web search via %s returned no usable results.", name)
        except Exception as exc:
            logger.warning("Web search provider %s failed: %s", name, exc)

    return []
