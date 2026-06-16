import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
ENABLE_VECTOR_MODELS = os.getenv("ENABLE_VECTOR_MODELS", "false").lower() == "true"
ENABLE_PDF_INGESTION = os.getenv("ENABLE_PDF_INGESTION", "false").lower() == "true"

COLLECTION_NAME = "nyaya_legal"
EMBEDDING_MODEL = "BAAI/bge-m3"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L6-v2"
EMBEDDING_DIM = 1024

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(DATA_DIR, "nyayaai.db"))
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL and DB_HOST and DB_USER and DB_PASSWORD and DB_NAME:
    DATABASE_URL = (
        f"postgresql://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}"
        f"@{DB_HOST}:{DB_PORT}/{quote_plus(DB_NAME)}"
    )

if DATABASE_URL and "sslmode=" not in DATABASE_URL:
    separator = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{separator}sslmode=require"

BM25_WEIGHT = 0.4
SEMANTIC_WEIGHT = 0.6
TOP_K_MERGED = 10
TOP_K_RERANKED = 3

# Auth & Email
JWT_SECRET = os.getenv("JWT_SECRET", "nyayaai-fallback-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
RESET_TOKEN_EXPIRATION_HOURS = 1

EMAIL_FROM = os.getenv("EMAIL_FROM", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_SECURE = os.getenv("SMTP_SECURE", "false").lower() == "true"

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")
