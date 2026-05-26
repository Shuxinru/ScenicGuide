import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, QAPair
from app.schemas.knowledge import (
    DocumentOut, QAPairIn, QAPairOut, QAPairUpdate,
)
from app.services.knowledge_service import ingest_document

router = APIRouter()


# ---------------------------------------------------------------------------
# Document endpoints
# ---------------------------------------------------------------------------

@router.post("/knowledge/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    tags: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Upload and ingest a document."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "txt"
    allowed = {"pdf", "docx", "txt", "md"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    doc_id = await ingest_document(
        db=db,
        title=title,
        file_type=ext,
        content=content,
        tags=tag_list,
    )

    return {"id": doc_id, "message": "Document ingested successfully"}


@router.get("/knowledge/documents", response_model=list[DocumentOut])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List documents with pagination."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(KnowledgeDocument)
        .order_by(KnowledgeDocument.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/knowledge/documents/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single document by ID."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
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

    # Delete from ChromaDB
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

    # Delete from MySQL (cascade handles chunks)
    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted successfully"}


# ---------------------------------------------------------------------------
# QA Pair endpoints
# ---------------------------------------------------------------------------

@router.post("/knowledge/qa-pairs", response_model=QAPairOut)
async def create_qa_pair(qa_in: QAPairIn, db: AsyncSession = Depends(get_db)):
    """Create a new QA pair."""
    import uuid as uuid_lib
    qa = QAPair(
        id=str(uuid_lib.uuid4()),
        question=qa_in.question,
        answer=qa_in.answer,
        question_key=qa_in.question_key,
        tags=qa_in.tags,
        is_active=qa_in.is_active,
    )
    db.add(qa)
    await db.commit()
    await db.refresh(qa)
    return qa


@router.get("/knowledge/qa-pairs", response_model=list[QAPairOut])
async def list_qa_pairs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List QA pairs with pagination."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(QAPair)
        .order_by(QAPair.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()


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
