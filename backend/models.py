from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from backend.config import MAX_QUERY_CHARS, MAX_HISTORY_MESSAGES


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str = Field(..., max_length=MAX_QUERY_CHARS)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=MAX_QUERY_CHARS)
    law_filter: str = "ALL"
    history: Optional[List[ChatMessage]] = None
    # Text extracted from an attached document (separate from the query so large
    # documents aren't constrained by the query length cap).
    attachment_text: Optional[str] = Field(default=None, max_length=24000)
    attachment_name: Optional[str] = Field(default=None, max_length=300)
    # Base64-encoded image (screenshot/photo) for vision-capable analysis.
    image_data: Optional[str] = Field(default=None, max_length=10_000_000)
    image_mime: Optional[str] = Field(default=None, max_length=100)
    image_name: Optional[str] = Field(default=None, max_length=300)

    @field_validator("query")
    @classmethod
    def _query_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("query must not be empty")
        return v

    @field_validator("history")
    @classmethod
    def _cap_history(cls, v):
        # Keep only the most recent turns to bound prompt size and cost.
        if v and len(v) > MAX_HISTORY_MESSAGES:
            return v[-MAX_HISTORY_MESSAGES:]
        return v


class Citation(BaseModel):
    section: str
    law_type: str
    text_snippet: str
    page_number: int = 0


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: str = "MEDIUM"


class MapResponse(BaseModel):
    ipc: str
    bns: str
    description: str


class IngestResponse(BaseModel):
    status: str
    chunks_count: int
    files_processed: int


class HealthResponse(BaseModel):
    status: str


class LegalChunk(BaseModel):
    text: str
    section_number: str
    law_type: str
    page_number: int
    source_file: str = ""
