"""Tests for the web search fallback: helpers, provider fallback ordering, and
result normalization/filtering.
"""

import pytest

from backend import web_search
from backend.web_search import _clean, _ddg_real_url, web_search as run_search


def test_clean_strips_html_and_unescapes():
    assert _clean("<b>Hello</b> &amp; welcome") == "Hello & welcome"
    assert _clean(None) == ""


def test_ddg_real_url_unwraps_redirect():
    wrapped = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage&rut=abc"
    assert _ddg_real_url(wrapped) == "https://example.com/page"


def test_ddg_real_url_passthrough_when_direct():
    assert _ddg_real_url("https://example.com") == "https://example.com"


@pytest.mark.asyncio
async def test_web_search_disabled_returns_empty(monkeypatch):
    monkeypatch.setattr(web_search, "ENABLE_WEB_SEARCH", False)
    assert await run_search("anything") == []


@pytest.mark.asyncio
async def test_web_search_empty_query_returns_empty(monkeypatch):
    monkeypatch.setattr(web_search, "ENABLE_WEB_SEARCH", True)
    assert await run_search("   ") == []


@pytest.mark.asyncio
async def test_web_search_filters_results_without_url_or_snippet(monkeypatch):
    monkeypatch.setattr(web_search, "ENABLE_WEB_SEARCH", True)
    monkeypatch.setattr(web_search, "TAVILY_API_KEY", "")
    monkeypatch.setattr(web_search, "SERPER_API_KEY", "")

    async def fake_ddg(query, limit):
        return [
            {"title": "Good", "url": "https://a.com", "snippet": "useful text"},
            {"title": "No url", "url": "", "snippet": "text"},
            {"title": "No snippet", "url": "https://b.com", "snippet": ""},
        ]

    monkeypatch.setattr(web_search, "_duckduckgo", fake_ddg)
    results = await run_search("triple talaq")
    assert len(results) == 1
    assert results[0]["url"] == "https://a.com"


@pytest.mark.asyncio
async def test_web_search_falls_through_failing_provider(monkeypatch):
    monkeypatch.setattr(web_search, "ENABLE_WEB_SEARCH", True)
    monkeypatch.setattr(web_search, "TAVILY_API_KEY", "key")
    monkeypatch.setattr(web_search, "SERPER_API_KEY", "")

    async def failing_tavily(query, limit):
        raise RuntimeError("tavily down")

    async def fake_ddg(query, limit):
        return [{"title": "Fallback", "url": "https://c.com", "snippet": "ddg text"}]

    monkeypatch.setattr(web_search, "_tavily", failing_tavily)
    monkeypatch.setattr(web_search, "_duckduckgo", fake_ddg)

    results = await run_search("some query")
    assert len(results) == 1
    assert results[0]["url"] == "https://c.com"
