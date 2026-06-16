# NyayaAI — Implementation Steps

## Step 1: Backend Foundation
- [ ] Create `backend/config.py` — env var loading (GROQ_API_KEY, QDRANT_URL, QDRANT_API_KEY, GROQ_MODEL)
- [ ] Create `backend/models.py` — Pydantic models (ChatRequest, Citation, MapResponse, etc.)
- [ ] Create `backend/ipc_bns_map.py` — IPC→BNS mapping dictionary + lookup function

## Step 2: Backend Ingestion
- [ ] Create `backend/ingestion.py` — PDF parsing with pdfplumber, section-based chunking, bge-m3 embeddings, Qdrant storage, BM25 index building

## Step 3: Backend Retriever
- [ ] Create `backend/retriever.py` — HybridRetriever class with BM25 + Qdrant semantic search, score normalization, weighted merge, cross-encoder reranking, confidence scoring

## Step 4: Backend LLM
- [ ] Create `backend/llm.py` — System prompt, context building, Groq API streaming, SSE token yielding, citations JSON emission

## Step 5: Backend API
- [ ] Create `backend/main.py` — FastAPI app, CORS, POST /chat (streaming), GET /map, POST /ingest, GET /health, startup event to load models

## Step 6: Backend Dependencies
- [ ] Create `backend/requirements.txt` — All Python dependencies

## Step 7: Frontend Setup
- [ ] Scaffold Vite + React project in `frontend/`
- [ ] Install Tailwind CSS v4, lucide-react, jspdf, html2canvas
- [ ] Configure Vite proxy for backend API

## Step 8: Frontend Theme
- [ ] Create `frontend/src/index.css` — Tailwind imports, dark theme variables, custom scrollbar styles

## Step 9: Frontend App Shell
- [ ] Create `frontend/src/main.jsx` — React entry point
- [ ] Create `frontend/src/App.jsx` — Layout (Sidebar + ChatWindow), state management, toast

## Step 10: Frontend Sidebar
- [ ] Create `frontend/src/components/Sidebar.jsx` — Logo, law filter, IPC→BNS mapper, new chat button

## Step 11: Frontend InputBar
- [ ] Create `frontend/src/components/InputBar.jsx` — Auto-resize textarea, send button, streaming state

## Step 12: Frontend CitationCard
- [ ] Create `frontend/src/components/CitationCard.jsx` — Law badge, section preview, expand, copy

## Step 13: Frontend MessageBubble
- [ ] Create `frontend/src/components/MessageBubble.jsx` — User/AI message layout, confidence badge, citation cards, ask-a-lawyer CTA

## Step 14: Frontend ChatWindow
- [ ] Create `frontend/src/components/ChatWindow.jsx` — Welcome state, message list, streaming fetch (SSE), auto-scroll

## Step 15: Root Config
- [ ] Create `.env` — Environment variables
- [ ] Create `.gitignore` — Python + Node ignores
- [ ] Create `data/.gitkeep` — Empty placeholder for PDF directory

## Step 16: Verify
- [ ] Backend: Run `pip install -r requirements.txt`
- [ ] Backend: Run `python -c "from backend.main import app; print('OK')"`
- [ ] Frontend: Run `npm install && npm run dev`
- [ ] Test: Place a PDF in `data/`, hit POST /ingest, then POST /chat
