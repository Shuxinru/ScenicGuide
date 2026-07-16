from datetime import datetime
from pydantic import BaseModel


class SettingsUpdate(BaseModel):
    scenic_name: str | None = None
    description: str | None = None
    contact_info: str | None = None
    logo_url: str | None = None
    changed_by: str | None = None


class SettingsOut(BaseModel):
    id: str
    scenic_name: str
    description: str | None
    contact_info: str | None
    logo_url: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScenicAreaCreate(BaseModel):
    scenic_name: str
    description: str | None = None
    contact_info: str | None = None
    logo_url: str | None = None
    changed_by: str | None = None


class ExpandRequest(BaseModel):
    scenic_name: str
    topic: str = ""
    mode: str = "auto"  # "auto" or "manual"
    content: str | None = None  # manual content


class HistoryOut(BaseModel):
    id: str
    settings_id: str
    changed_by: str
    changes: dict
    created_at: datetime

    class Config:
        from_attributes = True
