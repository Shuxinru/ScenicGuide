import uuid
import os
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.avatar import AvatarConfig
from app.schemas.avatar import AvatarConfigIn, AvatarConfigOut

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.get("/avatar/config", response_model=AvatarConfigOut)
async def get_avatar_config(db: AsyncSession = Depends(get_db)):
    """Get the current avatar configuration."""
    result = await db.execute(select(AvatarConfig).limit(1))
    config = result.scalars().first()
    if not config:
        config = AvatarConfig(
            id=str(uuid.uuid4()),
            style="default",
            greeting_msg="您好！我是景区AI导览助手，有什么可以帮您的？",
            persona_prompt="你是一个热情、知识渊博的景区导览助手。请用简洁友好的中文回答游客的问题。",
            tone="friendly",
            voice_name="voice-0",
            voice_speed=1.0,
            voice_pitch=1.0,
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@router.put("/avatar/config", response_model=AvatarConfigOut)
async def update_avatar_config(
    config_in: AvatarConfigIn,
    db: AsyncSession = Depends(get_db),
):
    """Update the avatar configuration."""
    result = await db.execute(select(AvatarConfig).limit(1))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="Avatar config not found")

    update_data = config_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)
    return config


@router.post("/avatar/upload-clothing", response_model=AvatarConfigOut)
async def upload_clothing_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a clothing image for the digital human."""
    # Validate file type
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(status_code=400, detail="仅支持 PNG/JPG/JPEG/WEBP 图片格式")

    # Generate unique filename
    safe_name = f"clothing_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(AVATAR_DIR, safe_name)

    # Save file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Build relative URL path
    clothing_url = f"/api/v1/static/avatars/{safe_name}"

    # Update avatar config
    result = await db.execute(select(AvatarConfig).limit(1))
    config = result.scalars().first()
    if not config:
        config = AvatarConfig(
            id=str(uuid.uuid4()),
            style="default",
            greeting_msg="您好！我是景区AI导览助手，有什么可以帮您的？",
            persona_prompt="你是一个热情、知识渊博的景区导览助手。请用简洁友好的中文回答游客的问题。",
            tone="friendly",
            voice_name="voice-0",
            voice_speed=1.0,
            voice_pitch=1.0,
            clothing_url=clothing_url,
        )
        db.add(config)
    else:
        config.clothing_url = clothing_url

    await db.commit()
    await db.refresh(config)
    return config


@router.post("/avatar/clear-clothing", response_model=AvatarConfigOut)
async def clear_clothing_image(
    db: AsyncSession = Depends(get_db),
):
    """Clear the clothing image, restoring default dress appearance."""
    result = await db.execute(select(AvatarConfig).limit(1))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="Avatar config not found")

    config.clothing_url = None
    await db.commit()
    await db.refresh(config)
    return config
