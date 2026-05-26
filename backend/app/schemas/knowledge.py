from datetime import datetime
from pydantic import BaseModel
from typing import TypeVar, Generic

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class DocumentOut(BaseModel):
    id: str
    title: str
    file_type: str
    file_name: str | None = None
    file_size: int | None = None
    status: str
    chunk_count: int
    tags: list
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChunkOut(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    token_count: int
    vector_store_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class QAPairIn(BaseModel):
    question: str
    answer: str
    question_key: str | None = None
    tags: list[str] = []
    is_active: bool = True


class QAPairOut(BaseModel):
    id: str
    question: str
    answer: str
    question_key: str | None = None
    tags: list
    usage_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QAPairUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    question_key: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None
