# NyayaAI

NyayaAI is an AI-powered Indian legal assistant that helps users understand legal queries in plain language, map IPC sections to BNS sections, and retrieve grounded answers from official/legal source material using a hybrid RAG pipeline.

## Features

- Plain-language legal Q&A
- IPC to BNS section mapping
- Hybrid retrieval using BM25 + vector search
- Citation-backed answers
- User authentication with Postgres
- PDF ingestion for legal reference documents
- React frontend with a polished UI
- FastAPI backend with streaming responses

## Tech Stack

- Frontend: React, Vite, Framer Motion
- Backend: FastAPI, Python
- Database: Neon Postgres
- Vector Search: Qdrant
- LLM: Groq
- PDF parsing: pdfplumber
- Retrieval: BM25 + sentence-transformers

## Project Structure

```text
NyayaAI/
  backend/
  frontend/
  data/
  docker-compose.yml
  Dockerfile.backend
  Dockerfile.frontend
  nginx.conf
```

## How It Works

1. PDFs are placed in the `data/` folder.
2. The ingestion pipeline extracts and chunks the text.
3. Chunks are stored in the database with metadata.
4. Embeddings are indexed in Qdrant.
5. User queries are retrieved with a hybrid search strategy.
6. The LLM generates a concise answer with citations.

## Local Setup

### 1) Clone the repo

```powershell
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd NyayaAI
```

### 2) Backend environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

JWT_SECRET=your_long_random_secret

EMAIL_FROM=you@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=your_app_password
SMTP_SECURE=false

ENABLE_VECTOR_MODELS=false
ENABLE_PDF_INGESTION=true
```

### 3) Run with Docker

```powershell
docker-compose up --build
```

This starts:

- Qdrant on `6333`
- Backend on `8000`
- Frontend on `80`

### 4) Run backend manually

```powershell
cd backend
python -m uvicorn backend.main:app --reload --port 8000
```

### 5) Run frontend manually

```powershell
cd frontend
npm install
npm run dev
```

## Production Build

### Frontend

```powershell
cd frontend
npm run build
```

### Backend

```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /health` - backend health check
- `POST /chat` - streaming legal Q&A
- `GET /map?ipc=...` - IPC to BNS mapping
- `POST /ingest` - ingest PDFs from `data/`
- `POST /auth/register` - create user
- `POST /auth/login` - login user
- `POST /auth/forgot-password` - password reset flow
- `POST /auth/reset-password` - set new password

## Deployment Notes

Recommended free deployment setup:

- Backend: Render Web Service
- Frontend: Render Static Site
- Database: Neon Postgres
- Vector DB: Qdrant Cloud or a separate hosted Qdrant instance

Backend Render settings:

```text
Environment: Docker
Dockerfile Path: Dockerfile.backend
Root Directory: leave blank
```

Frontend Render settings:

```text
Environment: Static Site
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

Frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

Backend environment variable for CORS:

```env
FRONTEND_ORIGIN=https://your-frontend.onrender.com
```

Important:

- Keep all secrets in environment variables.
- Do not commit `.env`.
- Make sure the backend can reach the Postgres host and Qdrant host.
- Pin Python to 3.11 on Render using `runtime.txt` so package installs do not try to build for Python 3.14.

## Push to GitHub

### 1) Initialize git

```powershell
git init
```

### 2) Check status

```powershell
git status
```

### 3) Add files

```powershell
git add .
```

### 4) Commit

```powershell
git commit -m "Initial NyayaAI project"
```

### 5) Connect remote

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

If the remote already exists:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

### 6) Push

```powershell
git push -u origin main
```

## Notes

- If you update the backend configuration or database settings, restart the backend.
- If you use Docker locally, make sure ports `80`, `8000`, and `6333` are free.
- For demos, keep a few PDF files in `data/` so ingestion has content to index.
