import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, QAPair
from app.schemas.knowledge import (
    DocumentOut, ChunkOut, QAPairIn, QAPairOut, QAPairUpdate, PaginatedResponse,
)
from app.services.knowledge_service import ingest_document

router = APIRouter()


# ---------------------------------------------------------------------------
# Document endpoints
# ---------------------------------------------------------------------------

@router.post("/knowledge/documents")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    tags: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Upload and ingest a document. (FormData)"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "txt"
    allowed = {"pdf", "docx", "txt", "md"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    tag_list = json.loads(tags) if tags else []

    doc_id = await ingest_document(
        db=db,
        title=title,
        file_type=ext,
        content=content,
        tags=tag_list,
    )

    return {"id": doc_id, "title": title, "file_type": ext, "status": "completed",
            "chunk_count": 0, "tags": tag_list, "message": "Document ingested successfully"}


@router.get("/knowledge/documents")
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    """List documents with pagination and search."""
    offset = (page - 1) * page_size

    base_query = select(KnowledgeDocument)
    count_query = select(func.count(KnowledgeDocument.id))

    if search:
        filter_clause = or_(
            KnowledgeDocument.title.contains(search),
            KnowledgeDocument.file_type.contains(search),
        )
        base_query = base_query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    # Get total
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get items
    result = await db.execute(
        base_query
        .order_by(KnowledgeDocument.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/knowledge/documents/{doc_id}")
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single document by ID."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/knowledge/documents/{doc_id}/chunks")
async def list_chunks(doc_id: str, db: AsyncSession = Depends(get_db)):
    """List chunks for a document."""
    result = await db.execute(
        select(KnowledgeChunk)
        .where(KnowledgeChunk.document_id == doc_id)
        .order_by(KnowledgeChunk.chunk_index)
    )
    return result.scalars().all()


@router.put("/knowledge/documents/{doc_id}")
async def update_document(
    doc_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update document metadata."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    for field in ["title", "content", "tags"]:
        if field in data:
            setattr(doc, field, data[field])

    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/knowledge/documents/{doc_id}")
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document and its chunks."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        from app.core.vector_store import get_or_create_collection
        collection = get_or_create_collection("scenic_knowledge")
        chunks_result = await db.execute(
            select(KnowledgeChunk).where(KnowledgeChunk.document_id == doc_id)
        )
        chunk_ids = [c.id for c in chunks_result.scalars().all()]
        if chunk_ids:
            collection.delete(ids=chunk_ids)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted successfully"}


# ---------------------------------------------------------------------------
# QA Pair endpoints
# ---------------------------------------------------------------------------

@router.post("/knowledge/qa-pairs", response_model=QAPairOut)
async def create_qa_pair(qa_in: QAPairIn, db: AsyncSession = Depends(get_db)):
    """Create a new QA pair."""
    qa = QAPair(
        id=str(uuid.uuid4()),
        question=qa_in.question,
        answer=qa_in.answer,
        question_key=qa_in.question_key or "",
        tags=qa_in.tags or [],
        is_active=qa_in.is_active,
    )
    db.add(qa)
    await db.commit()
    await db.refresh(qa)
    return qa


@router.get("/knowledge/qa-pairs")
async def list_qa_pairs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    """List QA pairs with pagination and search."""
    offset = (page - 1) * page_size

    base_query = select(QAPair)
    count_query = select(func.count(QAPair.id))

    if search:
        filter_clause = or_(
            QAPair.question.contains(search),
            QAPair.answer.contains(search),
        )
        base_query = base_query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        base_query
        .order_by(QAPair.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/knowledge/qa-pairs/{qa_id}", response_model=QAPairOut)
async def get_qa_pair(qa_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single QA pair."""
    result = await db.execute(select(QAPair).where(QAPair.id == qa_id))
    qa = result.scalars().first()
    if not qa:
        raise HTTPException(status_code=404, detail="QA pair not found")
    return qa


@router.put("/knowledge/qa-pairs/{qa_id}", response_model=QAPairOut)
async def update_qa_pair(
    qa_id: str,
    qa_update: QAPairUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a QA pair."""
    result = await db.execute(select(QAPair).where(QAPair.id == qa_id))
    qa = result.scalars().first()
    if not qa:
        raise HTTPException(status_code=404, detail="QA pair not found")

    update_data = qa_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(qa, field, value)

    await db.commit()
    await db.refresh(qa)
    return qa


@router.delete("/knowledge/qa-pairs/{qa_id}")
async def delete_qa_pair(qa_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a QA pair."""
    result = await db.execute(select(QAPair).where(QAPair.id == qa_id))
    qa = result.scalars().first()
    if not qa:
        raise HTTPException(status_code=404, detail="QA pair not found")
    await db.delete(qa)
    await db.commit()
    return {"message": "QA pair deleted successfully"}
