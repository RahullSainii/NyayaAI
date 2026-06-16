from pydantic import BaseModel
from typing import List, Optional


class ChatRequest(BaseModel):
    query: str
    law_filter: str = "ALL"


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
