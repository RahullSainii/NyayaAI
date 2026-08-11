import json
import logging
import re
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.config import (
    ADMIN_API_KEY,
    CORS_ALLOW_LOCALHOST,
    DATA_DIR,
    FRONTEND_ORIGIN,
    FRONTEND_ORIGINS,
)
from backend.auth import get_current_user
from backend.rate_limit import chat_rate_limit
from backend.models import ChatRequest, MapResponse, IngestResponse, HealthResponse
from backend.ipc_bns_map import get_bns_mapping
from backend.ingestion import ingest_pdfs
from backend.retriever import ensure_ready, index_chunks_to_qdrant, retrieve
from backend.llm import (
    stream_response,
    stream_web_response,
    stream_document_response,
    stream_vision_response,
    build_citations,
    build_web_citations,
    looks_like_refusal,
    rewrite_search_query,
    OUT_OF_SCOPE_MESSAGE,
)
from backend.web_search import web_search
from backend.extraction import extract_text
from backend.config import ENABLE_WEB_SEARCH
from backend.auth import router as auth_router
from backend.rate_limit import upload_rate_limit

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NyayaAI starting up...")
    # Warm the local corpus so the first chat request does not run empty-handed.
    try:
        await ensure_ready()
    except Exception as exc:
        logger.warning("Startup warm-up skipped: %s", exc)
    logger.info("NyayaAI ready.")
    yield
    logger.info("NyayaAI shutting down.")


app = FastAPI(
    title="NyayaAI",
    description="AI Legal Assistant for Indian Law (IPC, BNS, CrPC)",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins: list[str] = []
if FRONTEND_ORIGIN:
    allowed_origins.append(FRONTEND_ORIGIN)
allowed_origins.extend(FRONTEND_ORIGINS)

# Localhost dev origins are only included when explicitly allowed (default on for
# dev). Set CORS_ALLOW_LOCALHOST=false in production to restrict to real origins.
if CORS_ALLOW_LOCALHOST:
    allowed_origins.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ])

# De-duplicate while preserving order.
allowed_origins = list(dict.fromkeys(allowed_origins))
if not allowed_origins:
    logger.warning("No CORS origins configured; set FRONTEND_ORIGIN for production.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)

app.include_router(auth_router)


@app.get("/")
async def root():
    return {"name": "NyayaAI", "status": "ok", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok")


@app.get("/map", response_model=MapResponse)
async def map_ipc_to_bns(ipc: str = Query(..., description="IPC section number")):
    result = get_bns_mapping(ipc)
    if result is None:
        return MapResponse(ipc=ipc, bns="Not Found", description="No BNS mapping found for this IPC section")
    return MapResponse(**result)


async def require_admin(x_admin_key: str = Header(default="")):
    """Guard administrative endpoints. Disabled entirely if no admin key is set."""
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Administrative endpoints are disabled.")
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key.")


@app.post("/ingest", response_model=IngestResponse, dependencies=[Depends(require_admin)])
async def ingest():
    try:
        chunks = ingest_pdfs()
        await index_chunks_to_qdrant(chunks)
        return IngestResponse(
            status="success",
            chunks_count=len(chunks),
            files_processed=len(set(c.source_file for c in chunks)),
        )
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return IngestResponse(status=f"error: {str(e)}", chunks_count=0, files_processed=0)


async def _safe_web_search(query: str) -> list:
    if not ENABLE_WEB_SEARCH:
        return []
    try:
        return await web_search(query)
    except Exception as exc:
        logger.warning("Web search fallback failed: %s", exc)
        return []


def _token_event(token: str) -> str:
    return f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"


def _emit_text(text: str):
    """Yield SSE token events for an already-generated string, preserving spacing."""
    for piece in re.split(r"(\s+)", text):
        if piece:
            yield _token_event(piece)


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/extract", dependencies=[Depends(upload_rate_limit)])
async def extract(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    """Extract plain text from an uploaded PDF / DOCX / text document."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")

    try:
        result = extract_text(file.filename or "", data)
    except ValueError as exc:
        # Expected, user-facing reasons (unsupported type, scanned PDF, etc.)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Text extraction failed for %s: %s", file.filename, exc)
        raise HTTPException(status_code=500, detail="Could not extract text from this file.")

    return {
        "filename": file.filename,
        "text": result["text"],
        "chars": len(result["text"]),
        "truncated": result["truncated"],
    }


def _build_search_query(query: str, history) -> str:
    """Resolve follow-up references (e.g. "cases for it") by prepending the
    topic from recent user turns, so retrieval and web search aren't blind."""
    if not history:
        return query
    recent_user = [
        h.content for h in history
        if getattr(h, "role", None) in ("user", None) and getattr(h, "content", "")
    ]
    if not recent_user:
        return query
    # Use the last couple of user turns as topical context for the search.
    context = " ".join(recent_user[-2:])
    return f"{context} {query}".strip()[:600]


@app.post("/chat", dependencies=[Depends(chat_rate_limit)])
async def chat(req: ChatRequest, user: str = Depends(get_current_user)):
    history = req.history or []
    history_dicts = [{"role": h.role, "content": h.content} for h in history]
    search_query = _build_search_query(req.query, history)
    has_image = bool(req.image_data and req.image_data.strip())
    has_attachment = bool(req.attachment_text and req.attachment_text.strip())

    if has_image or has_attachment:
        # Image or document present -> answer from it; skip KB/web retrieval.
        chunks, confidence = [], "IMG" if has_image else "DOC"
    else:
        try:
            chunks, confidence = await retrieve(search_query, req.law_filter)
        except Exception as exc:
            logger.warning("Chat retrieval failed, falling back to empty context: %s", exc)
            chunks, confidence = [], "LOW"

    # Lazily rewrite the question into a focused Indian-law web query, but only
    # when a web branch is actually reached (avoids an LLM call for KB answers).
    _web_query_cache: dict = {}

    async def _web_query() -> str:
        if "q" not in _web_query_cache:
            try:
                _web_query_cache["q"] = await rewrite_search_query(req.query, history_dicts)
            except Exception as exc:
                logger.warning("Query rewrite failed, using raw search query: %s", exc)
                _web_query_cache["q"] = search_query
        return _web_query_cache["q"]

    async def event_stream():
        source = "kb"
        citations: list = []
        answer_confidence = confidence
        try:
            if has_image:
                # Answer about the attached image via a vision model.
                source = "image"
                answer_confidence = "IMG"
                async for token in stream_vision_response(
                    req.query, req.image_data, req.image_mime, req.image_name, history_dicts
                ):
                    yield _token_event(token)
                yield f"data: {json.dumps({'type': 'citations', 'citations': [], 'confidence': answer_confidence, 'source': source})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            if has_attachment:
                # Answer grounded in the attached document.
                source = "document"
                answer_confidence = "DOC"
                async for token in stream_document_response(
                    req.query, req.attachment_text, req.attachment_name, history_dicts
                ):
                    yield _token_event(token)
                yield f"data: {json.dumps({'type': 'citations', 'citations': [], 'confidence': answer_confidence, 'source': source})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

            kb_has_context = bool(chunks) and confidence != "LOW"

            if kb_has_context:
                # Generate the KB answer into a buffer first so we can verify it
                # actually answered rather than emitting a refusal with citations.
                buffer = []
                async for token in stream_response(req.query, chunks, req.law_filter, confidence, history_dicts):
                    buffer.append(token)
                kb_answer = "".join(buffer)

                if ENABLE_WEB_SEARCH and looks_like_refusal(kb_answer):
                    # The knowledge base couldn't answer -> try the web instead.
                    web_q = await _web_query()
                    logger.info("KB answer was a refusal; routing to web search: %s", web_q)
                    web_results = await _safe_web_search(web_q)
                    if web_results:
                        source = "web"
                        answer_confidence = "WEB"
                        citations = build_web_citations(web_results)
                        async for token in stream_web_response(req.query, web_results, history_dicts):
                            yield _token_event(token)
                    else:
                        # No web answer either: honest out-of-scope, no citations.
                        answer_confidence = "LOW"
                        for event in _emit_text(OUT_OF_SCOPE_MESSAGE):
                            yield event
                else:
                    # KB answered properly: stream the buffered answer + citations.
                    citations = build_citations(chunks)
                    for event in _emit_text(kb_answer):
                        yield event
            else:
                # No or low-confidence KB context -> go straight to web search.
                web_results = await _safe_web_search(await _web_query())
                if web_results:
                    source = "web"
                    answer_confidence = "WEB"
                    citations = build_web_citations(web_results)
                    async for token in stream_web_response(req.query, web_results, history_dicts):
                        yield _token_event(token)
                else:
                    answer_confidence = "LOW"
                    async for token in stream_response(req.query, [], req.law_filter, "LOW", history_dicts):
                        yield _token_event(token)

            yield f"data: {json.dumps({'type': 'citations', 'citations': citations, 'confidence': answer_confidence, 'source': source})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            # Log the detail server-side; send a generic message to the client.
            logger.exception("Chat stream error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'content': 'Something went wrong while generating a response. Please try again.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
