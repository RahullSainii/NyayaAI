import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from typing import Any, Dict, Iterable, List, Optional, Tuple

from backend.config import DATABASE_PATH, DATABASE_URL

logger = logging.getLogger(__name__)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except Exception:  # pragma: no cover - handled at runtime
    psycopg2 = None
    RealDictCursor = None


SQLITE_SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    law_type TEXT,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    section_number TEXT,
    page_number INTEGER,
    chunk_text TEXT NOT NULL,
    qdrant_point_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    citations_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
"""


POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    law_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    section_number TEXT,
    page_number INTEGER,
    chunk_text TEXT NOT NULL,
    qdrant_point_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    citations_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
"""


def _use_postgres() -> bool:
    return bool(DATABASE_URL)


def _ensure_sqlite_directory() -> None:
    directory = os.path.dirname(DATABASE_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)


def _normalize_query(query: str) -> str:
    return query.replace("?", "%s") if _use_postgres() else query


def _split_statements(schema: str) -> List[str]:
    return [stmt.strip() for stmt in schema.split(";") if stmt.strip()]


def get_connection():
    if _use_postgres():
        if psycopg2 is None:
            raise RuntimeError("psycopg2 is not installed. Install psycopg2-binary to use Postgres.")
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = False
        return conn

    _ensure_sqlite_directory()
    conn = sqlite3.connect(DATABASE_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_database() -> None:
    """Create tables if they do not exist yet."""
    schema = POSTGRES_SCHEMA if _use_postgres() else SQLITE_SCHEMA
    with get_connection() as conn:
        cur = conn.cursor()
        for stmt in _split_statements(schema):
            cur.execute(stmt)
        conn.commit()


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        cur = conn.cursor()
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _row_to_dict(row: Any) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    if isinstance(row, dict):
        return dict(row)
    return dict(row)


def fetch_one(query: str, params: Iterable[Any] = ()) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(_normalize_query(query), tuple(params))
        return _row_to_dict(cur.fetchone())


def fetch_all(query: str, params: Iterable[Any] = ()) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(_normalize_query(query), tuple(params))
        return [_row_to_dict(row) for row in cur.fetchall()]


def execute(query: str, params: Iterable[Any] = ()) -> int:
    with get_connection() as conn:
        cur = conn.cursor()
        prepared = _normalize_query(query)
        if _use_postgres() and query.lstrip().upper().startswith("INSERT") and "RETURNING" not in query.upper():
            prepared = f"{prepared.rstrip(';')} RETURNING id"
            cur.execute(prepared, tuple(params))
            row = cur.fetchone()
            conn.commit()
            if row is None:
                return 0
            return int(row["id"])

        cur.execute(prepared, tuple(params))
        conn.commit()
        return int(getattr(cur, "lastrowid", 0) or 0)


def get_all_users() -> List[Dict[str, Any]]:
    return fetch_all(
        "SELECT id, name, email, password_hash, created_at FROM users ORDER BY id ASC"
    )


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return fetch_one(
        "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
        (email.lower().strip(),),
    )


def create_or_replace_user(name: str, email: str, password_hash: str) -> int:
    email_norm = email.lower().strip()
    existing = get_user_by_email(email_norm)
    if existing:
        execute(
            "UPDATE users SET name = ?, password_hash = ? WHERE email = ?",
            (name.strip(), password_hash, email_norm),
        )
        return int(existing["id"])

    return execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (name.strip(), email_norm, password_hash),
    )


def update_user_password(email: str, password_hash: str) -> None:
    execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        (password_hash, email.lower().strip()),
    )


def ensure_document(filename: str, file_path: str, law_type: str, status: str = "processed") -> int:
    existing = get_document_by_filename(filename, file_path)
    if existing:
        execute(
            "UPDATE documents SET law_type = ?, status = ? WHERE id = ?",
            (law_type, status, existing["id"]),
        )
        return int(existing["id"])

    return execute(
        "INSERT INTO documents (filename, file_path, law_type, status) VALUES (?, ?, ?, ?)",
        (filename, file_path, law_type, status),
    )


def set_document_status(document_id: int, status: str) -> None:
    execute("UPDATE documents SET status = ? WHERE id = ?", (status, document_id))


def clear_chunks_for_document(document_id: int) -> None:
    execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))


def insert_chunk(
    document_id: int,
    section_number: str,
    page_number: int,
    chunk_text: str,
    qdrant_point_id: Optional[str] = None,
) -> int:
    return execute(
        """
        INSERT INTO chunks (document_id, section_number, page_number, chunk_text, qdrant_point_id)
        VALUES (?, ?, ?, ?, ?)
        """,
        (document_id, section_number, page_number, chunk_text, qdrant_point_id),
    )


def get_document_by_filename(filename: str, file_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if file_path is None:
        return fetch_one(
            "SELECT id, filename, file_path, law_type, uploaded_at, status FROM documents WHERE filename = ? ORDER BY id DESC LIMIT 1",
            (filename,),
        )

    return fetch_one(
        "SELECT id, filename, file_path, law_type, uploaded_at, status FROM documents WHERE filename = ? AND file_path = ? ORDER BY id DESC LIMIT 1",
        (filename, file_path),
    )


def create_chat_session(user_id: int, title: str = "") -> int:
    return execute(
        "INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)",
        (user_id, title.strip()),
    )


def insert_chat_message(
    session_id: int,
    role: str,
    content: str,
    citations_json: Optional[str] = None,
) -> int:
    return execute(
        """
        INSERT INTO chat_messages (session_id, role, content, citations_json)
        VALUES (?, ?, ?, ?)
        """,
        (session_id, role, content, citations_json),
    )


def migrate_users_from_legacy_json(users_file: str) -> int:
    """Optional one-time migration from the older JSON user store."""
    if not os.path.exists(users_file):
        return 0

    try:
        with open(users_file, "r", encoding="utf-8") as f:
            legacy_users = json.load(f)
    except Exception as exc:
        logger.warning("Skipping legacy user migration: %s", exc)
        return 0

    if not isinstance(legacy_users, dict):
        return 0

    migrated = 0
    for email, user in legacy_users.items():
        if not isinstance(user, dict):
            continue
        name = str(user.get("name", "")).strip()
        password_hash = str(user.get("password_hash", "")).strip()
        if not name or not password_hash:
            continue
        create_or_replace_user(name, email, password_hash)
        migrated += 1

    if migrated:
        logger.info("Migrated %s legacy user(s) into the database.", migrated)
    return migrated
