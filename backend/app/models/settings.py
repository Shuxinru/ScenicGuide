import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


def _new_id() -> str:
    return str(uuid.uuid4())


class ScenicSettings(Base):
    __tablename__ = "scenic_settings"

    id = Column(String(36), primary_key=True, default=_new_id)
    scenic_name = Column(String(200), nullable=False, default="景区")
    description = Column(Text, nullable=True, default="")
    contact_info = Column(String(500), nullable=True, default="")
    logo_url = Column(String(500), nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SettingsHistory(Base):
    __tablename__ = "settings_history"

    id = Column(String(36), primary_key=True, default=_new_id)
    settings_id = Column(String(36), ForeignKey("scenic_settings.id"), nullable=False)
    changed_by = Column(String(100), nullable=False, default="admin")
    changes = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    settings = relationship("ScenicSettings", backref="history")
