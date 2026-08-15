"""High-level streaming response generators.

Each `stream_*` function assembles a prompt from the relevant system
prompt + context, iterates the model chain, and yields tokens. Callers
in main.py don't need to know about providers or fallback logic.
"""

import logging
from typing import AsyncGenerator, Dict, List

import groq
import httpx

from backend.legal_facts import extract_section_from_query, get_section_profile
from backend.llm.client import (
    _get_client,
    _model_chain,
    gemini_generate_vision,
    stream_gemini_response,
    stream_groq_response,
    stream_text,
)
from backend.llm.prompts import (
    DOCUMENT_SYSTEM_PROMPT,
    OUT_OF_SCOPE_MESSAGE,
    SYSTEM_PROMPT,
    VISION_SYSTEM_PROMPT,
    WEB_SYSTEM_PROMPT,
    build_kb_context,
    build_web_context,
    history_messages,
)

logger = logging.getLogger(__name__)


# ── Local fallback (no LLM needed) ──────────────────────────────────────

def _format_local_answer(query: str, chunks: List[Dict], confidence: str) -> str:
    top_section = next(
        (chunk.get("section_number") for chunk in chunks if chunk.get("section_number")),
        None,
    )
    fact = get_section_profile(extract_section_from_query(query) or top_section)
    citations = []

    for chunk in chunks[:3]:
        section = chunk.get("section_number", "N/A")
        law = chunk.get("law_type", "IPC")
        page = chunk.get("page_number", "N/A")
        citations.append(f"{law} Section {section} (Page {page})")

    if fact:
        bns_text = ""
        if fact.get("bns") and fact["bns"] != "N/A":
            bns_text = f" The BNS equivalent is Section {fact['bns']}."

        status = "non-bailable" if not fact.get("bailable", True) else "bailable"
        cognizable = "cognizable" if fact.get("cognizable", True) else "non-cognizable"
        summary = fact["summary"]
        citation_text = f" Relevant references: {', '.join(citations)}." if citations else ""
        return (
            f"**Answer:** {summary} is generally {cognizable} and {status}.{bns_text}\n\n"
            f"**Why:** The knowledge base points to this section, and this answer is based on the local legal mapping available in NyayaAI.\n\n"
            f"**Note:** Confidence level: {confidence}.{citation_text}"
        )

    if citations:
        return (
            f"**Answer:** I found related legal material, but the local knowledge base does not store enough detail to confirm the exact bail status or procedure for this question.\n\n"
            f"**Relevant sections:** {', '.join(citations)}\n\n"
            f"**Note:** Confidence level: {confidence}. Please consult a qualified lawyer for case-specific advice."
        )

    return (
        "The knowledge base doesn't have detailed information on this. Please consult a qualified lawyer for accurate legal advice."
    )


async def _fallback_stream(
    query: str, chunks: List[Dict], confidence: str
) -> AsyncGenerator[str, None]:
    answer = _format_local_answer(query, chunks, confidence)
    async for token in stream_text(answer):
        yield token


# ── Generic model-chain streamer ─────────────────────────────────────────

async def _stream_with_chain(
    messages: List[Dict],
    fallback_gen: AsyncGenerator[str, None] | None = None,
    label: str = "LLM",
) -> AsyncGenerator[str, None]:
    """Try each model in the chain; yield from the first that succeeds.

    If all fail, yield from *fallback_gen* (or the out-of-scope message).
    """
    client = _get_client()
    last_error: Exception | None = None

    for provider, model in _model_chain():
        try:
            if provider == "groq":
                if client is None:
                    raise RuntimeError("GROQ_API_KEY is required for Groq models")
                logger.info("Streaming %s response with Groq model: %s", label, model)
                async for token in stream_groq_response(client, model, messages):
                    yield token
                return
            if provider == "gemini":
                logger.info("Streaming %s response with Gemini model: %s", label, model)
                async for token in stream_gemini_response(model, messages):
                    yield token
                return
            logger.warning("Skipping unsupported LLM provider: %s", provider)
        except (groq.APIError, httpx.HTTPError, RuntimeError) as e:
            last_error = e
            status_code = getattr(e, "status_code", None)
            if status_code is None and getattr(e, "response", None) is not None:
                status_code = e.response.status_code
            logger.warning(
                "%s model %s:%s failed (status %s); trying next fallback.",
                label, provider, model, status_code or "unknown",
            )

    if last_error:
        logger.error("All %s models failed; using fallback: %s", label, last_error)

    if fallback_gen is not None:
        async for token in fallback_gen:
            yield token
    else:
        async for token in stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token


# ── Public streaming functions ───────────────────────────────────────────

async def stream_response(
    query: str,
    chunks: List[Dict],
    law_filter: str = "ALL",
    confidence: str = "LOW",
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer grounded in knowledge-base chunks."""
    if not chunks:
        async for token in stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token
        return

    context = build_kb_context(chunks)
    user_message = f"""Based on the following legal sections, answer the user's question.

LEGAL CONTEXT:
{context}

USER QUESTION: {query}

Provide a clear, citizen-friendly answer with proper citations."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history_messages(history),
        {"role": "user", "content": user_message},
    ]

    try:
        async for token in _stream_with_chain(
            messages,
            fallback_gen=_fallback_stream(query, chunks, confidence),
            label="KB",
        ):
            yield token
    except Exception as e:
        logger.error("Unexpected error in KB streaming: %s", e)
        async for token in _fallback_stream(query, chunks, confidence):
            yield token


async def stream_web_response(
    query: str,
    results: List[Dict],
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer grounded in web search results."""
    if not results:
        async for token in stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token
        return

    context = build_web_context(results)
    user_message = (
        f"WEB SEARCH RESULTS:\n{context}\n\n"
        f"USER QUESTION: {query}\n\n"
        "Answer using only the results above, with the required disclaimer and inline [n] source references."
    )
    messages = [
        {"role": "system", "content": WEB_SYSTEM_PROMPT},
        *history_messages(history),
        {"role": "user", "content": user_message},
    ]

    # Last-resort fallback: present raw snippets.
    async def _raw_snippets():
        fallback = (
            "Note: This answer is based on general web sources, not NyayaAI's verified "
            "statute database. Please verify with a qualified lawyer.\n\n"
            + "\n\n".join(
                f"[{i}] {r.get('title', '')}: {r.get('snippet', '')[:300]} ({r.get('url', '')})"
                for i, r in enumerate(results, 1)
            )
        )
        async for token in stream_text(fallback):
            yield token

    try:
        async for token in _stream_with_chain(messages, fallback_gen=_raw_snippets(), label="Web"):
            yield token
    except Exception as e:
        logger.error("Unexpected error in web answer streaming: %s", e)
        async for token in stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token


async def stream_document_response(
    query: str,
    document_text: str,
    document_name: str | None = None,
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer grounded in an attached document's text."""
    doc = (document_text or "").strip()
    if not doc:
        async for token in stream_text(
            "I couldn't read any text from the attached document. Please try a different file."
        ):
            yield token
        return

    name = document_name or "attached document"
    question = (query or "").strip() or "Summarise this document and explain its key legal points."
    user_message = (
        f'ATTACHED DOCUMENT ({name}):\n"""\n{doc[:24000]}\n"""\n\n'
        f"USER QUESTION: {question}\n\n"
        "Answer using the document above."
    )
    messages = [
        {"role": "system", "content": DOCUMENT_SYSTEM_PROMPT},
        *history_messages(history),
        {"role": "user", "content": user_message},
    ]

    async def _doc_fallback():
        async for token in stream_text(
            "I couldn't analyse the attached document right now. Please try again in a moment."
        ):
            yield token

    try:
        async for token in _stream_with_chain(messages, fallback_gen=_doc_fallback(), label="Document"):
            yield token
    except Exception as e:  # noqa: BLE001
        logger.error("Unexpected error in document answer streaming: %s", e)
        async for token in stream_text(
            "Something went wrong while analysing the document. Please try again."
        ):
            yield token


async def stream_vision_response(
    query: str,
    image_b64: str,
    image_mime: str | None = None,
    image_name: str | None = None,
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer about an attached image using a Gemini vision model."""
    from backend.config import GEMINI_API_KEY as _key

    if not _key:
        async for token in stream_text(
            "Image understanding isn't available on this server (it needs a vision-capable "
            "model). Please attach a PDF or text document instead."
        ):
            yield token
        return
    if not image_b64:
        async for token in stream_text("I couldn't read the attached image. Please try another file."):
            yield token
        return

    question = (query or "").strip() or "Explain what this image shows and any legal relevance."
    mime = image_mime or "image/png"

    from backend.llm.prompts import VISION_SYSTEM_PROMPT as _vsp

    last_error: Exception | None = None
    for provider, model in _model_chain():
        if provider != "gemini":
            continue  # only multimodal Gemini models can read images
        try:
            text = await gemini_generate_vision(model, _vsp, question, image_b64, mime)
            async for token in stream_text(text):
                yield token
            return
        except (httpx.HTTPError, RuntimeError) as e:
            last_error = e
            logger.warning("Vision model %s failed: %s", model, e)

    logger.error("All vision models failed: %s", last_error)
    async for token in stream_text(
        "I couldn't analyse the image right now. Please try again, or attach the document as a PDF or text file."
    ):
        yield token
