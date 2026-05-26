from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service
from app.utils.document_parser import parse_document
from app.utils.text_splitter import split_text
from app.core.vector_store import get_or_create_collection
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk


async def ingest_document(
    db: AsyncSession,
    title: str,
    file_type: str,
    content: bytes,
    tags: list[str] | None = None,
) -> str:
    """Parse, split, embed, and store a document into ChromaDB and MySQL.

    Returns the document ID.
    """
    from sqlalchemy import text as sa_text
    import uuid

    # 1. Parse document
    parsed_text = parse_document(content, file_type)

    # 2. Split into chunks
    chunks = split_text(parsed_text)

    # 3. Generate embeddings for all chunks
    embeddings = await embedding_service.embed_texts(chunks)

    # 4. Store document record in MySQL
    doc_id = str(uuid.uuid4())
    doc = KnowledgeDocument(
        id=doc_id,
        title=title,
        file_type=file_type,
        content=parsed_text,
        status="completed",
        chunk_count=len(chunks),
        tags=tags or [],
    )
    db.add(doc)
    await db.commit()

    # 5. Store chunks in ChromaDB and MySQL
    collection = get_or_create_collection("scenic_knowledge")

    for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = str(uuid.uuid4())

        # ChromaDB
        collection.add(
            ids=[chunk_id],
            embeddings=[embedding],
            documents=[chunk_text],
            metadatas=[{"document_id": doc_id, "document_title": title, "chunk_index": i}],
        )

        # MySQL
        chunk = KnowledgeChunk(
            id=chunk_id,
            document_id=doc_id,
            chunk_index=i,
            content=chunk_text,
            token_count=len(chunk_text),
            vector_store_id=chunk_id,
        )
        db.add(chunk)

    await db.commit()
    return doc_id
