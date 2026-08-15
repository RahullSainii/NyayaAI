"""LLM client management — Groq, Gemini API wrappers and model chain.

Handles provider-agnostic model fallback, so callers just iterate the
chain and get whichever model responds first.
"""

import logging
import re
from typing import AsyncGenerator, Dict, Iterable, List, Tuple
from urllib.parse import quote

import groq
import httpx

from backend.config import GEMINI_API_KEY, GROQ_API_KEY, GROQ_MODEL, LLM_FALLBACKS

logger = logging.getLogger(__name__)

_client: groq.Groq | None = None


def _get_client() -> groq.Groq | None:
    global _client
    if not GROQ_API_KEY:
        return None
    if _client is None:
        _client = groq.Groq(api_key=GROQ_API_KEY, timeout=8.0, max_retries=0)
    return _client


def _parse_model_entry(entry: str) -> Tuple[str, str]:
    if ":" not in entry:
        return "groq", entry.strip()
    provider, model = entry.split(":", 1)
    return provider.strip().lower(), model.strip()


def _model_chain() -> Iterable[Tuple[str, str]]:
    seen = set()
    entries = [f"groq:{GROQ_MODEL}", *LLM_FALLBACKS]
    for entry in entries:
        provider, model = _parse_model_entry(entry)
        if not model:
            continue
        key = (provider, model)
        if key in seen:
            continue
        seen.add(key)
        yield provider, model


# ── Low-level provider calls ────────────────────────────────────────────

async def stream_groq_response(
    client: groq.Groq,
    model: str,
    messages: List[Dict],
) -> AsyncGenerator[str, None]:
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=1600,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def gemini_generate(
    model: str, messages: List[Dict], max_tokens: int = 1024
) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is required for Gemini fallbacks")

    system_message = next(
        (m["content"] for m in messages if m.get("role") == "system"), ""
    )
    convo_parts = []
    for m in messages:
        if m.get("role") == "system":
            continue
        speaker = "Assistant" if m.get("role") == "assistant" else "User"
        convo_parts.append(f"{speaker}: {m['content']}")
    user_text = "\n\n".join(convo_parts)

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "systemInstruction": {"parts": [{"text": system_message}]},
        "generationConfig": {"maxOutputTokens": max_tokens},
    }

    async with httpx.AsyncClient(timeout=25.0) as http:
        response = await http.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        response.raise_for_status()

    data = response.json()
    parts = (
        data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    )
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise RuntimeError(f"Gemini model {model} returned no text")
    return text


async def stream_gemini_response(
    model: str, messages: List[Dict]
) -> AsyncGenerator[str, None]:
    text = await gemini_generate(model, messages, max_tokens=1600)
    async for token in stream_text(text):
        yield token


async def gemini_generate_vision(
    model: str,
    system_text: str,
    user_text: str,
    image_b64: str,
    mime: str,
    max_tokens: int = 1600,
) -> str:
    """Send an image + prompt to a Gemini multimodal model and return the answer."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is required for image understanding")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent"
    )
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": user_text},
                {"inline_data": {"mime_type": mime or "image/png", "data": image_b64}},
            ],
        }],
        "systemInstruction": {"parts": [{"text": system_text}]},
        "generationConfig": {"maxOutputTokens": max_tokens},
    }

    async with httpx.AsyncClient(timeout=45.0) as http:
        response = await http.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        response.raise_for_status()

    data = response.json()
    parts = (
        data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    )
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise RuntimeError(f"Gemini model {model} returned no text for the image")
    return text


# ── Completion helper (non-streaming) ───────────────────────────────────

async def complete(messages: List[Dict], max_tokens: int = 200) -> str:
    """Non-streaming single completion across the model chain.

    Used for short helper tasks like query rewriting. Returns '' if every
    model fails.
    """
    client = _get_client()
    for provider, model in _model_chain():
        try:
            if provider == "groq":
                if client is None:
                    raise RuntimeError("GROQ_API_KEY is required for Groq models")
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=max(max_tokens, 256),
                    stream=False,
                )
                text = (resp.choices[0].message.content or "").strip()
                if text:
                    return text
                raise RuntimeError(f"Groq model {model} returned empty content")
            if provider == "gemini":
                text = (await gemini_generate(model, messages, max_tokens)).strip()
                if text:
                    return text
                raise RuntimeError(f"Gemini model {model} returned empty content")
        except Exception as e:  # noqa: BLE001 - best-effort helper
            logger.warning("Completion model %s:%s failed: %s", provider, model, e)
    return ""


# ── Utility ─────────────────────────────────────────────────────────────

async def stream_text(text: str) -> AsyncGenerator[str, None]:
    """Yield whitespace-delimited tokens from an already-generated string."""
    for chunk in re.split(r"(\s+)", text):
        if chunk:
            yield chunk
