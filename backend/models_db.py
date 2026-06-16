from dataclasses import dataclass
from typing import Optional


@dataclass
class UserRecord:
    id: Optional[int]
    name: str
    email: str
    password_hash: str
    created_at: Optional[str] = None


@dataclass
class DocumentRecord:
    id: Optional[int]
    filename: str
    file_path: str
    law_type: Optional[str] = None
    uploaded_at: Optional[str] = None
    status: str = "pending"


@dataclass
class ChunkRecord:
    id: Optional[int]
    document_id: int
    section_number: Optional[str]
    page_number: Optional[int]
    chunk_text: str
    qdrant_point_id: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class ChatSessionRecord:
    id: Optional[int]
    user_id: int
    title: str = ""
    created_at: Optional[str] = None


@dataclass
class ChatMessageRecord:
    id: Optional[int]
    session_id: int
    role: str
    content: str
    citations_json: Optional[str] = None
    created_at: Optional[str] = None
