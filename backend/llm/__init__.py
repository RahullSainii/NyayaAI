"""NyayaAI LLM package — provider-agnostic LLM interface.

Modules:
    client    — Groq/Gemini API wrappers, model fallback chain
    prompts   — System prompts, context builders, history helpers
    streams   — High-level streaming response generators
    citations — Citation builders, refusal detection, query rewriting

Re-exports the public API so existing `from backend.llm import …` lines
continue to work unchanged.
"""

# Re-export the public API expected by main.py
from backend.llm.citations import (  # noqa: F401
    build_citations,
    build_web_citations,
    looks_like_refusal,
    rewrite_search_query,
)
from backend.llm.prompts import OUT_OF_SCOPE_MESSAGE  # noqa: F401
from backend.llm.streams import (  # noqa: F401
    stream_document_response,
    stream_response,
    stream_vision_response,
    stream_web_response,
)
