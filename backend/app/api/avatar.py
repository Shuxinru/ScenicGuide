import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.avatar import AvatarConfig
from app.schemas.avatar import AvatarConfigIn, AvatarConfigOut

router = APIRouter()


@router.get("/avatar/config", response_model=AvatarConfigOut)
async def get_avatar_config(db: AsyncSession = Depends(get_db)):
    """Get the current avatar configuration."""
    result = await db.execute(select(AvatarConfig).limit(1))
    config = result.scalars().first()
    if not config:
        # Create default config if none exists
        config = AvatarConfig(
            id=str(uuid.uuid4()),
            style="default",
            greeting_msg="您好！我是景区AI导览助手，有什么可以帮您的？",
            persona_prompt="你是一个热情、知识渊博的景区导览助手。请用简洁友好的中文回答游客的问题。",
            tone="friendly",
            voice_name="zh-CN-XiaoxiaoNeural",
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
