import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.config import DATA_DIR
from backend.models import ChatRequest, MapResponse, IngestResponse, HealthResponse
from backend.ipc_bns_map import get_bns_mapping
from backend.ingestion import ingest_pdfs
from backend.retriever import ensure_ready, index_chunks_to_qdrant, retrieve
from backend.llm import stream_response, build_citations
from backend.auth import router as auth_router

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok")


@app.get("/map", response_model=MapResponse)
async def map_ipc_to_bns(ipc: str = Query(..., description="IPC section number")):
    result = get_bns_mapping(ipc)
    if result is None:
        return MapResponse(ipc=ipc, bns="Not Found", description="No BNS mapping found for this IPC section")
    return MapResponse(**result)


@app.post("/ingest", response_model=IngestResponse)
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


@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        chunks, confidence = await retrieve(req.query, req.law_filter)
    except Exception as exc:
        logger.warning("Chat retrieval failed, falling back to empty context: %s", exc)
        chunks, confidence = [], "LOW"

    citations = build_citations(chunks)

    async def event_stream():
        try:
            async for token in stream_response(req.query, chunks, req.law_filter, confidence):
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            yield f"data: {json.dumps({'type': 'citations', 'citations': citations, 'confidence': confidence})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
