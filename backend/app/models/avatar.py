import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AvatarConfig(Base):
    __tablename__ = "avatar_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    style: Mapped[str] = mapped_column(String(50), default="default")
    model_path: Mapped[str] = mapped_column(String(500), nullable=True)
    greeting_msg: Mapped[str] = mapped_column(Text, default="您好！我是景区AI导览助手，有什么可以帮您的？")
    persona_prompt: Mapped[str] = mapped_column(Text, default="你是一个热情、知识渊博的景区导览助手。请用简洁友好的中文回答游客的问题。")
    tone: Mapped[str] = mapped_column(String(20), default="friendly")
    voice_name: Mapped[str] = mapped_column(String(50), default="zh-CN-XiaoxiaoNeural")
    voice_speed: Mapped[float] = mapped_column(Float, default=1.0)
    voice_pitch: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
