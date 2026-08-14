import logging
import os
import sys
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

_log = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
LLM_FALLBACKS = [
    item.strip()
    for item in os.getenv("LLM_FALLBACKS", "").split(",")
    if item.strip()
]
ENABLE_VECTOR_MODELS = os.getenv("ENABLE_VECTOR_MODELS", "false").lower() == "true"
ENABLE_PDF_INGESTION = os.getenv("ENABLE_PDF_INGESTION", "false").lower() == "true"

# Web search fallback: used only when the local knowledge base has no relevant
# answer. Providers are tried in order of the keys that are configured; if none
# are set, a keyless DuckDuckGo fallback is attempted.
ENABLE_WEB_SEARCH = os.getenv("ENABLE_WEB_SEARCH", "true").lower() == "true"
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
WEB_SEARCH_MAX_RESULTS = int(os.getenv("WEB_SEARCH_MAX_RESULTS", "5"))

COLLECTION_NAME = "nyaya_legal"
EMBEDDING_MODEL = "BAAI/bge-m3"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L6-v2"
EMBEDDING_DIM = 1024

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# Cache of parsed PDF chunks so we don't re-run pdfplumber on every startup.
# Invalidated automatically per-file when a PDF's size or mtime changes.
ENABLE_PARSE_CACHE = os.getenv("ENABLE_PARSE_CACHE", "true").lower() == "true"
PARSE_CACHE_PATH = os.getenv(
    "PARSE_CACHE_PATH", os.path.join(DATA_DIR, ".chunk_cache.json")
)
DATABASE_PATH = os.getenv("DATABASE_PATH", os.path.join(DATA_DIR, "nyayaai.db"))

# Postgres connection pool bounds. Keep max modest for hosted DBs (e.g. Neon)
# which cap concurrent connections.
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))
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

# Relevance gating: drop weak chunks and detect out-of-scope questions so we
# never answer (or cite) from material that does not actually match the query.
RERANK_SCORE_FLOOR = float(os.getenv("RERANK_SCORE_FLOOR", "0.3"))
# Minimum fraction of meaningful query terms that must appear in the retrieved
# context for the question to be considered "in scope" for our knowledge base.
MIN_TERM_COVERAGE = float(os.getenv("MIN_TERM_COVERAGE", "0.2"))

# Auth & Email
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET is not set. Refusing to start with an insecure default. "
        "Set a long, random JWT_SECRET in your environment / .env file "
        "(e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`)."
    )
if len(JWT_SECRET) < 32:
    _log.warning(
        "JWT_SECRET is shorter than 32 characters (%d chars). "
        "Use a longer random secret in production "
        "(e.g. `python -c \"import secrets; print(secrets.token_urlsafe(48))\"`)",
        len(JWT_SECRET),
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
RESET_TOKEN_EXPIRATION_HOURS = 1

# Admin key required to call destructive/administrative endpoints (e.g. /ingest).
# If unset, those endpoints are disabled entirely rather than left open.
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "").strip()

EMAIL_FROM = os.getenv("EMAIL_FROM", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_SECURE = os.getenv("SMTP_SECURE", "false").lower() == "true"
# Trailing slashes must be stripped: CORS matches the browser's Origin header,
# which never includes a trailing slash.
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "").strip().rstrip("/")
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
# Allow localhost dev origins in CORS. Set to "false" in production so only the
# configured frontend origin(s) are permitted.
CORS_ALLOW_LOCALHOST = os.getenv("CORS_ALLOW_LOCALHOST", "true").lower() == "true"

# Max characters accepted for a chat query / a single history message, to bound
# LLM cost and prevent oversized-payload abuse.
MAX_QUERY_CHARS = int(os.getenv("MAX_QUERY_CHARS", "4000"))
MAX_HISTORY_MESSAGES = int(os.getenv("MAX_HISTORY_MESSAGES", "12"))

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")


# ---------------------------------------------------------------------------
# Startup validation
# ---------------------------------------------------------------------------

def validate_config_on_startup() -> None:
    """Run once at import-time to catch misconfigurations early.

    * Hard errors  → the app refuses to start.
    * Warnings     → the app starts but logs an actionable message.
    """
    # -- Hard requirements (already enforced above for JWT_SECRET) -----------
    # Nothing extra to add here; JWT_SECRET crash-guard is at module level.

    # -- Soft warnings -------------------------------------------------------
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        _log.warning(
            "Neither GROQ_API_KEY nor GEMINI_API_KEY is set. "
            "The chat endpoint will not be able to generate responses."
        )

    if not DATABASE_URL:
        _log.warning(
            "DATABASE_URL is not set — falling back to local SQLite at %s. "
            "This is fine for development but NOT suitable for production.",
            DATABASE_PATH,
        )

    if CORS_ALLOW_LOCALHOST and FRONTEND_ORIGIN and "localhost" not in FRONTEND_ORIGIN:
        _log.warning(
            "CORS_ALLOW_LOCALHOST is enabled while FRONTEND_ORIGIN is set to a "
            "non-localhost URL (%s). Set CORS_ALLOW_LOCALHOST=false in production.",
            FRONTEND_ORIGIN,
        )

    if ADMIN_API_KEY and len(ADMIN_API_KEY) < 16:
        _log.warning(
            "ADMIN_API_KEY is very short (%d chars). Use a strong random key.",
            len(ADMIN_API_KEY),
        )

    _log.info(
        "Config validated — CORS origins: %s | DB: %s | Web search: %s",
        FRONTEND_ORIGIN or "(localhost only)",
        "PostgreSQL" if DATABASE_URL else "SQLite",
        "enabled" if ENABLE_WEB_SEARCH else "disabled",
    )


# Run validation at module load (i.e. when the app starts).
validate_config_on_startup()
