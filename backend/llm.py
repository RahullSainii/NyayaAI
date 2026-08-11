import json
import logging
import re
from urllib.parse import quote
from typing import List, Dict, AsyncGenerator, Iterable, Tuple

import groq
import httpx

from backend.config import GEMINI_API_KEY, GROQ_API_KEY, GROQ_MODEL, LLM_FALLBACKS
from backend.legal_facts import extract_section_from_query, get_section_profile

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


OUT_OF_SCOPE_MESSAGE = (
    "I couldn't find this topic in NyayaAI's current knowledge base, so I can't "
    "give a grounded answer. I only answer from the statutes I have indexed "
    "(such as the Constitution of India, IPC/BNS, CrPC, Consumer Protection Act, "
    "RTI Act, IT Act, Domestic Violence Act, Insolvency and Bankruptcy Code, and "
    "the Hindu Marriage Act).\n\n"
    "If this law isn't in that list, please consult a qualified lawyer, or ask "
    "about a topic covered by the sources above and I'll help."
)


SYSTEM_PROMPT = """You are NyayaAI, an expert legal assistant for Indian law.

Your knowledge base covers, among others: the Constitution of India, the Indian Penal Code (IPC) and its Bharatiya Nyaya Sanhita (BNS) equivalents, the Code of Criminal Procedure (CrPC), the Consumer Protection Act, the Right to Information Act, the Information Technology Act, the Protection of Women from Domestic Violence Act, the Insolvency and Bankruptcy Code, and the Hindu Marriage Act.

Your Purpose:
- Provide accurate, citizen-friendly legal information based on actual statute text
- Help users understand their rights, obligations, and legal procedures
- Guide people on when to seek professional legal counsel

Rules:
1. **Citation First**: Always cite exact section numbers and law names (e.g., "Section 302 IPC", "Section 103(1) BNS")
2. **Context Only**: Answer ONLY from the provided legal context. Do NOT fabricate sections or provisions.
3. **Practical Explanation**: Explain legal concepts in simple language, avoiding jargon where possible. Include:
   - What the section means
   - Who it applies to
   - What punishments/procedures it covers
   - Real-world examples when relevant
4. **Complete Information**: If multiple sections are relevant to a question, mention all of them.
5. **Honesty**: If the provided context is insufficient, say: "The knowledge base doesn't have detailed information on this. Please consult a qualified lawyer for accurate legal advice."
6. **Tone**: Be respectful, neutral, and professional. Never give personal legal opinions.
7. **Structure**: Organize answers with clear sections (e.g., Definition, Punishment, Procedure, Examples)

Format for answers:
- Start with the main section(s) and what they cover
- Explain the law in everyday language
- Highlight key points (who, what, punishment, bail status)
- End with when to seek legal help"""


def _build_context(chunks: List[Dict]) -> str:
    if not chunks:
        return "No relevant legal sections found in the knowledge base."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        section = chunk.get("section_number", "N/A")
        law = chunk.get("law_type", "IPC")
        text = chunk.get("text", "")[:800]
        page = chunk.get("page_number", "N/A")
        context_parts.append(
            f"[{i}] Section {section} ({law}), Page {page}:\n{text}"
        )

    return "\n\n".join(context_parts)


def _format_local_answer(query: str, chunks: List[Dict], confidence: str) -> str:
    top_section = next((chunk.get("section_number") for chunk in chunks if chunk.get("section_number")), None)
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


async def _stream_text(text: str) -> AsyncGenerator[str, None]:
    for chunk in re.split(r"(\s+)", text):
        if chunk:
            yield chunk


async def _fallback_stream(query: str, chunks: List[Dict], confidence: str) -> AsyncGenerator[str, None]:
    answer = _format_local_answer(query, chunks, confidence)
    async for token in _stream_text(answer):
        yield token


async def _stream_groq_response(
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


async def _gemini_generate(model: str, messages: List[Dict], max_tokens: int = 1024) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is required for Gemini fallbacks")

    system_message = next((m["content"] for m in messages if m.get("role") == "system"), "")
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

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        response.raise_for_status()

    data = response.json()
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise RuntimeError(f"Gemini model {model} returned no text")
    return text


async def _stream_gemini_response(model: str, messages: List[Dict]) -> AsyncGenerator[str, None]:
    text = await _gemini_generate(model, messages, max_tokens=1600)
    async for token in _stream_text(text):
        yield token


async def _gemini_generate_vision(
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

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        response.raise_for_status()

    data = response.json()
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise RuntimeError(f"Gemini model {model} returned no text for the image")
    return text


async def _complete(messages: List[Dict], max_tokens: int = 200) -> str:
    """Non-streaming single completion across the model chain (for short helper
    tasks like query rewriting). Returns '' if every model fails."""
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
                    # Reasoning models (e.g. gpt-oss) spend tokens on hidden
                    # reasoning; keep enough headroom for actual output.
                    max_tokens=max(max_tokens, 256),
                    stream=False,
                )
                text = (resp.choices[0].message.content or "").strip()
                if text:
                    return text
                # Empty content (common with reasoning models on tiny budgets)
                # -> treat as failure and fall through to the next model.
                raise RuntimeError(f"Groq model {model} returned empty content")
            if provider == "gemini":
                text = (await _gemini_generate(model, messages, max_tokens)).strip()
                if text:
                    return text
                raise RuntimeError(f"Gemini model {model} returned empty content")
        except Exception as e:  # noqa: BLE001 - best-effort helper
            logger.warning("Completion model %s:%s failed: %s", provider, model, e)
    return ""


_QUERY_REWRITE_SYSTEM = (
    "You turn a user's legal question into ONE focused web search query for "
    "INDIAN law. Output only the query text (no quotes, max 16 words). Include "
    "the relevant Indian statute or legal-topic keywords and the word 'India'. "
    "If the question relies on earlier conversation, resolve references (like "
    "'it'/'this') to the actual topic. Do not answer the question."
)


async def rewrite_search_query(query: str, history: List[Dict] | None = None) -> str:
    """Rewrite a (possibly context-dependent) question into a focused Indian-law
    web search query. Falls back to the original query if the LLM is unavailable."""
    convo = ""
    hist = _history_messages(history, limit=4)
    if hist:
        convo = "\n".join(f"{m['role']}: {m['content'][:300]}" for m in hist)

    user = (
        (f"Earlier conversation:\n{convo}\n\n" if convo else "")
        + f"Question: {query}\n\nSearch query:"
    )
    messages = [
        {"role": "system", "content": _QUERY_REWRITE_SYSTEM},
        {"role": "user", "content": user},
    ]
    try:
        rewritten = await _complete(messages, max_tokens=40)
    except Exception:
        rewritten = ""

    rewritten = (rewritten or "").strip().strip('"').splitlines()[0].strip() if rewritten else ""
    # Guard against the model echoing junk or being too short.
    if len(rewritten) < 4:
        return query
    return rewritten[:200]


def _history_messages(history: List[Dict] | None, limit: int = 6) -> List[Dict]:
    """Normalize prior turns into chat messages for conversational context."""
    if not history:
        return []
    normalized = []
    for turn in history[-limit:]:
        role = turn.get("role") if isinstance(turn, dict) else getattr(turn, "role", None)
        content = turn.get("content") if isinstance(turn, dict) else getattr(turn, "content", None)
        if not content:
            continue
        role = "assistant" if role in ("assistant", "ai") else "user"
        normalized.append({"role": role, "content": str(content)[:1500]})
    return normalized


async def stream_response(
    query: str,
    chunks: List[Dict],
    law_filter: str = "ALL",
    confidence: str = "LOW",
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    # No relevant context means the question is out of scope for our corpus.
    # Answer honestly instead of letting the model guess from its own memory,
    # which is what produced misleading refusals paired with irrelevant citations.
    if not chunks:
        async for token in _stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token
        return

    context = _build_context(chunks)

    user_message = f"""Based on the following legal sections, answer the user's question.

LEGAL CONTEXT:
{context}

USER QUESTION: {query}

Provide a clear, citizen-friendly answer with proper citations."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history_messages(history),
        {"role": "user", "content": user_message},
    ]

    try:
        client = _get_client()
        last_error: Exception | None = None

        for provider, model in _model_chain():
            try:
                if provider == "groq":
                    if client is None:
                        raise RuntimeError("GROQ_API_KEY is required for Groq models")
                    logger.info("Streaming LLM response with Groq model: %s", model)
                    async for token in _stream_groq_response(client, model, messages):
                        yield token
                    return

                if provider == "gemini":
                    logger.info("Streaming LLM response with Gemini model: %s", model)
                    async for token in _stream_gemini_response(model, messages):
                        yield token
                    return

                logger.warning("Skipping unsupported LLM provider in LLM_FALLBACKS: %s", provider)
            except (groq.APIError, httpx.HTTPError, RuntimeError) as e:
                last_error = e
                status_code = getattr(e, "status_code", None)
                if status_code is None and getattr(e, "response", None) is not None:
                    status_code = e.response.status_code
                logger.warning(
                    "%s model %s failed with status %s; trying next fallback if available.",
                    provider,
                    model,
                    status_code or "unknown",
                )

        if last_error:
            logger.error("All configured LLM models failed; using local fallback: %s", last_error)
        async for token in _fallback_stream(query, chunks, confidence):
            yield token

    except groq.APIError as e:
        logger.error(f"Groq API error: {e}")
        async for token in _fallback_stream(query, chunks, confidence):
            yield token
    except Exception as e:
        logger.error(f"Unexpected error in LLM streaming: {e}")
        async for token in _fallback_stream(query, chunks, confidence):
            yield token


WEB_SYSTEM_PROMPT = """You are NyayaAI, an expert assistant on Indian law. The user's question was not in your curated statute database, so you have web search results to help. Produce a clear, well-reasoned answer like a knowledgeable Indian lawyer would.

How to answer:
1. Begin with this one-line disclaimer: "Note: This is general legal information based on web sources and established Indian law, not a substitute for advice from a qualified lawyer."
2. Give a direct one- or two-sentence answer to the question first.
3. Then structure the explanation with short bold headings, choosing what fits the question, e.g.:
   - **Governing Law** - the relevant Indian statutes/principles (e.g., Companies Act, 2013; Indian Contract Act, 1872; Specific Relief Act, 1963).
   - **Analysis** - apply the law to the specific facts in the question, reasoning step by step.
   - **Practical Steps / Remedies** - what the person can realistically do.
   - **When to consult a lawyer** - one short line.
4. Use the web results as supporting evidence and cite them inline as [1], [2] where relevant.
5. You MAY use well-established principles of Indian law that you are confident about, even if the web results are thin. But do NOT invent specific section numbers, case names, or citations you are unsure of - state the principle in plain terms instead.
6. If the web results are irrelevant (e.g., forums or study material), rely on general Indian legal principles and briefly note that authoritative sources were limited - do not just say you cannot answer.
7. Be thorough but plain-spoken. Prefer concrete guidance over generic hedging. Never invent facts about the user's situation."""


def _build_web_context(results: List[Dict]) -> str:
    parts = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "").strip()
        url = r.get("url", "").strip()
        snippet = r.get("snippet", "").strip()[:800]
        parts.append(f"[{i}] {title}\nURL: {url}\n{snippet}")
    return "\n\n".join(parts)


async def stream_web_response(
    query: str,
    results: List[Dict],
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer grounded in web search results (KB had no match)."""
    if not results:
        async for token in _stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token
        return

    context = _build_web_context(results)
    user_message = (
        f"WEB SEARCH RESULTS:\n{context}\n\n"
        f"USER QUESTION: {query}\n\n"
        "Answer using only the results above, with the required disclaimer and inline [n] source references."
    )
    messages = [
        {"role": "system", "content": WEB_SYSTEM_PROMPT},
        *_history_messages(history),
        {"role": "user", "content": user_message},
    ]

    try:
        client = _get_client()
        last_error: Exception | None = None

        for provider, model in _model_chain():
            try:
                if provider == "groq":
                    if client is None:
                        raise RuntimeError("GROQ_API_KEY is required for Groq models")
                    async for token in _stream_groq_response(client, model, messages):
                        yield token
                    return
                if provider == "gemini":
                    async for token in _stream_gemini_response(model, messages):
                        yield token
                    return
            except (groq.APIError, httpx.HTTPError, RuntimeError) as e:
                last_error = e
                logger.warning("Web-answer model %s:%s failed: %s", provider, model, e)

        if last_error:
            logger.error("All models failed for web answer; streaming raw snippets: %s", last_error)
        # Last-resort fallback: present the snippets directly so the user still
        # gets the sourced information even without an LLM.
        fallback = (
            "Note: This answer is based on general web sources, not NyayaAI's verified "
            "statute database. Please verify with a qualified lawyer.\n\n"
            + "\n\n".join(
                f"[{i}] {r.get('title', '')}: {r.get('snippet', '')[:300]} ({r.get('url', '')})"
                for i, r in enumerate(results, 1)
            )
        )
        async for token in _stream_text(fallback):
            yield token
    except Exception as e:
        logger.error(f"Unexpected error in web answer streaming: {e}")
        async for token in _stream_text(OUT_OF_SCOPE_MESSAGE):
            yield token


DOCUMENT_SYSTEM_PROMPT = """You are NyayaAI, an expert assistant on Indian law. The user has attached a document and wants help understanding it.

Rules:
1. Answer the user's question using the attached document as the primary source. Reference or quote the relevant parts.
2. Apply your knowledge of Indian law to explain implications where helpful, but do NOT invent clauses, sections, or facts that are not in the document.
3. If the question cannot be answered from the document, say so clearly and offer general guidance.
4. Use clear, plain language with short headings where useful.
5. End with a one-line note: "Note: This is general legal information, not legal advice."
"""


async def stream_document_response(
    query: str,
    document_text: str,
    document_name: str | None = None,
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer grounded in an attached document's text."""
    doc = (document_text or "").strip()
    if not doc:
        async for token in _stream_text(
            "I couldn't read any text from the attached document. Please try a different file."
        ):
            yield token
        return

    name = document_name or "attached document"
    question = (query or "").strip() or "Summarise this document and explain its key legal points."
    user_message = (
        f"ATTACHED DOCUMENT ({name}):\n\"\"\"\n{doc[:24000]}\n\"\"\"\n\n"
        f"USER QUESTION: {question}\n\n"
        "Answer using the document above."
    )
    messages = [
        {"role": "system", "content": DOCUMENT_SYSTEM_PROMPT},
        *_history_messages(history),
        {"role": "user", "content": user_message},
    ]

    try:
        client = _get_client()
        last_error: Exception | None = None
        for provider, model in _model_chain():
            try:
                if provider == "groq":
                    if client is None:
                        raise RuntimeError("GROQ_API_KEY is required for Groq models")
                    async for token in _stream_groq_response(client, model, messages):
                        yield token
                    return
                if provider == "gemini":
                    async for token in _stream_gemini_response(model, messages):
                        yield token
                    return
            except (groq.APIError, httpx.HTTPError, RuntimeError) as e:
                last_error = e
                logger.warning("Document-answer model %s:%s failed: %s", provider, model, e)

        if last_error:
            logger.error("All models failed for document answer: %s", last_error)
        async for token in _stream_text(
            "I couldn't analyse the attached document right now. Please try again in a moment."
        ):
            yield token
    except Exception as e:  # noqa: BLE001
        logger.error("Unexpected error in document answer streaming: %s", e)
        async for token in _stream_text(
            "Something went wrong while analysing the document. Please try again."
        ):
            yield token


VISION_SYSTEM_PROMPT = """You are NyayaAI, an expert assistant on Indian law. The user has attached an image, often a screenshot of a document, notice, message, or legal text.

Rules:
1. Read any text visible in the image and understand what it shows.
2. Answer the user's question about the image, applying your knowledge of Indian law where relevant.
3. If it's a legal notice, form, or document, explain in plain language what it means and what the person may need to do.
4. Do NOT invent text or details that are not visible in the image. If the image is unclear or unreadable, say so.
5. End with a one-line note: "Note: This is general legal information, not legal advice."
"""


async def stream_vision_response(
    query: str,
    image_b64: str,
    image_mime: str | None = None,
    image_name: str | None = None,
    history: List[Dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream an answer about an attached image using a Gemini vision model."""
    if not GEMINI_API_KEY:
        async for token in _stream_text(
            "Image understanding isn't available on this server (it needs a vision-capable "
            "model). Please attach a PDF or text document instead."
        ):
            yield token
        return
    if not image_b64:
        async for token in _stream_text("I couldn't read the attached image. Please try another file."):
            yield token
        return

    question = (query or "").strip() or "Explain what this image shows and any legal relevance."
    mime = image_mime or "image/png"

    last_error: Exception | None = None
    for provider, model in _model_chain():
        if provider != "gemini":
            continue  # only multimodal Gemini models can read images
        try:
            text = await _gemini_generate_vision(model, VISION_SYSTEM_PROMPT, question, image_b64, mime)
            async for token in _stream_text(text):
                yield token
            return
        except (httpx.HTTPError, RuntimeError) as e:
            last_error = e
            logger.warning("Vision model %s failed: %s", model, e)

    logger.error("All vision models failed: %s", last_error)
    async for token in _stream_text(
        "I couldn't analyse the image right now. Please try again, or attach the document as a PDF or text file."
    ):
        yield token


def build_web_citations(results: List[Dict]) -> List[Dict]:
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


# Patterns that indicate the model (or local fallback) could not actually answer
# from the knowledge base. When detected, the chat layer re-routes to web search.
# Regex-based so filler words between key phrases (e.g. "knowledge base *provided*
# does not contain") are still caught, while genuine answers that merely say
# "consult a lawyer" are not.
_REFUSAL_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in (
        # "knowledge base [provided] does not / doesn't contain / have / include ..."
        r"knowledge base\b.{0,40}?\b(?:does not|doesn't|do not|don't)\s+(?:contain|have|include|provide|cover|list)",
        # "[provided/legal] context does not contain / include ..."
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


def build_citations(chunks: List[Dict]) -> List[Dict]:
    citations = []
    for chunk in chunks:
        citations.append({
            "section": chunk.get("section_number", "N/A"),
            "law_type": chunk.get("law_type", "IPC"),
            "text_snippet": chunk.get("text", "")[:200],
            "page_number": chunk.get("page_number", 0),
        })
    return citations
