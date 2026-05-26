import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.settings import ScenicSettings, SettingsHistory
from app.schemas.settings import SettingsOut, SettingsUpdate, HistoryOut

router = APIRouter()


async def _get_or_create_settings(db: AsyncSession) -> ScenicSettings:
    """Return the singleton settings row, creating a default if none exists."""
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
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Get current scenic settings."""
    return await _get_or_create_settings(db)


@router.put("/settings")
async def update_settings(
    data: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update scenic settings and record history."""
    settings = await _get_or_create_settings(db)

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
    db: AsyncSession = Depends(get_db),
):
    """Get modification history for scenic settings."""
    settings = await _get_or_create_settings(db)
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
