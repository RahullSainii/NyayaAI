import json
import logging
import re
from typing import List, Dict, AsyncGenerator

import groq

from backend.config import GROQ_API_KEY, GROQ_MODEL
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


SYSTEM_PROMPT = """You are NyayaAI, an expert legal assistant specializing in Indian law (IPC, BNS, CrPC).

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


async def stream_response(
    query: str,
    chunks: List[Dict],
    law_filter: str = "ALL",
    confidence: str = "LOW",
) -> AsyncGenerator[str, None]:
    context = _build_context(chunks)

    user_message = f"""Based on the following legal sections, answer the user's question.

LEGAL CONTEXT:
{context}

USER QUESTION: {query}

Provide a clear, citizen-friendly answer with proper citations."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        client = _get_client()
        if client is None:
            async for token in _fallback_stream(query, chunks, confidence):
                yield token
            return

        stream = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
            stream=True,
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except groq.APIError as e:
        logger.error(f"Groq API error: {e}")
        async for token in _fallback_stream(query, chunks, confidence):
            yield token
    except Exception as e:
        logger.error(f"Unexpected error in LLM streaming: {e}")
        async for token in _fallback_stream(query, chunks, confidence):
            yield token


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
