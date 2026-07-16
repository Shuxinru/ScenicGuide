import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.settings import ScenicSettings, SettingsHistory
from app.schemas.settings import SettingsOut, SettingsUpdate, HistoryOut, ScenicAreaCreate, ExpandRequest


def _strip_markdown(text: str) -> str:
    """Remove common markdown formatting characters while keeping the text."""
    # Remove bold/italic markers: **text**, *text*, __text__, _text_
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"_(.+?)_", r"\1", text)
    # Remove strikethrough
    text = re.sub(r"~~(.+?)~~", r"\1", text)
    # Remove inline code
    text = re.sub(r"`(.+?)`", r"\1", text)
    # Remove heading markers (##, ###, etc.) at line starts
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    return text.strip()

router = APIRouter()


async def _get_or_create_settings(db: AsyncSession, settings_id: str | None = None) -> ScenicSettings:
    """Return settings by id, or the first row, creating a default if none exists."""
    if settings_id:
        result = await db.execute(
            select(ScenicSettings).where(ScenicSettings.id == settings_id)
        )
        settings = result.scalars().first()
        if not settings:
            raise HTTPException(status_code=404, detail="Scenic area not found")
        return settings

    result = await db.execute(select(ScenicSettings).limit(1))
    settings = result.scalars().first()
    if not settings:
        settings = ScenicSettings(
            id=str(uuid.uuid4()),
            scenic_name="景区",
            description="",
            contact_info="",
            logo_url="",
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/settings")
async def get_settings(
    settings_id: str | None = Query(None, description="Optional scenic area ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get current scenic settings."""
    return await _get_or_create_settings(db, settings_id=settings_id)


@router.put("/settings")
async def update_settings(
    data: SettingsUpdate,
    settings_id: str | None = Query(None, description="Optional scenic area ID"),
    db: AsyncSession = Depends(get_db),
):
    """Update scenic settings and record history."""
    settings = await _get_or_create_settings(db, settings_id=settings_id)

    changes = {}
    if data.scenic_name is not None and data.scenic_name != settings.scenic_name:
        changes["scenic_name"] = {"old": settings.scenic_name, "new": data.scenic_name}
        settings.scenic_name = data.scenic_name
    if data.description is not None and data.description != settings.description:
        changes["description"] = {"old": settings.description, "new": data.description}
        settings.description = data.description
    if data.contact_info is not None and data.contact_info != settings.contact_info:
        changes["contact_info"] = {"old": settings.contact_info, "new": data.contact_info}
        settings.contact_info = data.contact_info
    if data.logo_url is not None and data.logo_url != settings.logo_url:
        changes["logo_url"] = {"old": settings.logo_url, "new": data.logo_url}
        settings.logo_url = data.logo_url

    if changes:
        history = SettingsHistory(
            id=str(uuid.uuid4()),
            settings_id=settings.id,
            changed_by=data.changed_by or "admin",
            changes=changes,
        )
        db.add(history)
        await db.commit()
        await db.refresh(settings)
    else:
        await db.commit()

    return settings


@router.post("/settings/revert")
async def revert_settings(
    history_id: str = Query(..., description="History entry ID to revert to"),
    db: AsyncSession = Depends(get_db),
):
    """Revert settings to a previous version from history."""
    result = await db.execute(
        select(SettingsHistory).where(SettingsHistory.id == history_id)
    )
    history_entry = result.scalars().first()
    if not history_entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    settings = await _get_or_create_settings(db)

    if not history_entry.changes:
        raise HTTPException(status_code=400, detail="No changes recorded in this history entry")

    for field, change in history_entry.changes.items():
        old_value = change.get("old", "")
        if hasattr(settings, field):
            setattr(settings, field, old_value)

    revert_history = SettingsHistory(
        id=str(uuid.uuid4()),
        settings_id=settings.id,
        changed_by="admin",
        changes={
            field: {"old": change.get("new", ""), "new": change.get("old", "")}
            for field, change in history_entry.changes.items()
        },
    )
    db.add(revert_history)
    await db.commit()
    await db.refresh(settings)

    return settings


@router.get("/settings/history")
async def get_settings_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    settings_id: str | None = Query(None, description="Optional scenic area ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get modification history for scenic settings."""
    settings = await _get_or_create_settings(db, settings_id=settings_id)
    offset = (page - 1) * page_size

    result = await db.execute(
        select(func.count(SettingsHistory.id))
        .where(SettingsHistory.settings_id == settings.id)
    )
    total = result.scalar() or 0

    result = await db.execute(
        select(SettingsHistory)
        .where(SettingsHistory.settings_id == settings.id)
        .order_by(SettingsHistory.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.delete("/settings/history/{history_id}")
async def delete_history(
    history_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a settings history record."""
    result = await db.execute(
        select(SettingsHistory).where(SettingsHistory.id == history_id)
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    await db.execute(
        delete(SettingsHistory).where(SettingsHistory.id == history_id)
    )
    await db.commit()
    return {"ok": True, "deleted": history_id}


@router.post("/settings/expand")
async def expand_knowledge(
    data: ExpandRequest,
    db: AsyncSession = Depends(get_db),
):
    """Expand knowledge base for a scenic area.

    Supports two modes:
    - auto: LLM generates content based on the topic
    - manual: user provides the content directly
    Content is chunked and ingested into the vector store for RAG retrieval.
    Markdown formatting is stripped from all content before storage.
    """
    import uuid as _uuid

    from app.services.llm_service import llm_service
    from app.services.embedding_service import embedding_service
    from app.core.vector_store import get_or_create_collection
    from app.models.knowledge import KnowledgeChunk, KnowledgeDocument

    _settings = await _get_or_create_settings(db)

    try:
        if data.mode == "manual":
            if not data.content or len(data.content.strip()) < 20:
                raise HTTPException(status_code=400, detail="手动模式下内容不能少于20字")
            content = data.content.strip()
            source_tag = "人工扩展"
        else:
            # Auto mode: generate via LLM
            if data.topic:
                prompt = f"""你是"{data.scenic_name}"景区的知识专家。请针对以下主题进行详细的知识扩充：

景区：{data.scenic_name}
扩展主题：{data.topic}

请生成一份详细的旅游知识内容，要求：
1. 紧扣主题，提供准确、深入的信息
2. 内容丰富，字数在500-1000字之间
3. 语言生动，适合游客阅读
4. 如涉及具体景点，请包含位置、特色、历史等相关信息
5. 不要使用markdown格式符号（如**加粗**、##标题等），用纯文本即可

请用中文回答。"""
            else:
                prompt = f"""请为"{data.scenic_name}"景区生成一份详细的旅游知识介绍，包含以下方面：
1. 景区概况和历史背景
2. 主要景点和特色
3. 文化意义
4. 游览建议

请用中文回答，内容充实，字数在500-1000字之间。不要使用markdown格式符号（如**加粗**、##标题等），用纯文本即可。"""

            messages = [{"role": "user", "content": prompt}]
            content = await llm_service.generate(messages, max_tokens=2000)

            if not content or len(content) < 50:
                raise HTTPException(status_code=500, detail="LLM generated insufficient content")
            source_tag = "自动生成"

        # Strip markdown formatting
        content = _strip_markdown(content)

        # Create a knowledge document
        doc_id = str(_uuid.uuid4())

        title = f"{data.scenic_name} — {data.topic}" if data.topic else f"{data.scenic_name}景区介绍"
        doc = KnowledgeDocument(
            id=doc_id,
            title=title,
            content=content,
            file_type="txt",
            tags=[data.scenic_name, data.topic or "景区介绍", source_tag],
        )
        db.add(doc)
        await db.flush()

        # Ingest into vector store
        collection = get_or_create_collection("scenic_knowledge")
        chunks = [content[i:i+500] for i in range(0, len(content), 500)]
        for idx, chunk_text in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{idx}"
            embedding = embedding_service.embed_query(chunk_text)
            collection.add(
                ids=[chunk_id],
                embeddings=[embedding],
                metadatas=[{"document_title": title, "chunk_index": idx, "scenic_area": data.scenic_name}],
                documents=[chunk_text],
            )

            # Also save chunk to DB
            chunk_record = KnowledgeChunk(
                id=str(_uuid.uuid4()),
                document_id=doc_id,
                chunk_index=idx,
                content=chunk_text,
                token_count=len(chunk_text),
                vector_store_id=chunk_id,
            )
            db.add(chunk_record)

        doc.chunk_count = len(chunks)
        doc.status = "completed"
        await db.commit()

        mode_label = "手动录入" if data.mode == "manual" else "AI生成"
        return {
            "ok": True,
            "message": f"知识库扩展完成（{mode_label}）：已为「{data.scenic_name}」入库 {len(chunks)} 个知识片段",
            "document_id": doc_id,
            "chunks_count": len(chunks),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"知识库扩展失败：{str(e)}")


@router.post("/settings/scenic-areas")
async def create_scenic_area(
    data: ScenicAreaCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new scenic area entry."""
    new_area = ScenicSettings(
        id=str(uuid.uuid4()),
        scenic_name=data.scenic_name,
        description=data.description or "",
        contact_info=data.contact_info or "",
        logo_url=data.logo_url or "",
    )
    db.add(new_area)

    history = SettingsHistory(
        id=str(uuid.uuid4()),
        settings_id=new_area.id,
        changed_by=data.changed_by or "admin",
        changes={"scenic_name": {"old": "", "new": data.scenic_name}},
    )
    db.add(history)
    await db.commit()
    await db.refresh(new_area)

    return new_area


@router.get("/settings/scenic-areas")
async def list_scenic_areas(
    db: AsyncSession = Depends(get_db),
):
    """List all scenic area settings."""
    result = await db.execute(
        select(ScenicSettings).order_by(ScenicSettings.created_at.desc())
    )
    areas = result.scalars().all()
    return {"items": areas, "total": len(areas)}
