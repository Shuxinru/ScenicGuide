from datetime import datetime
from pydantic import BaseModel


class AvatarConfigIn(BaseModel):
    style: str | None = None
    model_path: str | None = None
    greeting_msg: str | None = None
    persona_prompt: str | None = None
    tone: str | None = None
    voice_name: str | None = None
    voice_speed: float | None = None
    voice_pitch: float | None = None


class AvatarConfigOut(BaseModel):
    id: str
    style: str
    model_path: str | None
    greeting_msg: str
    persona_prompt: str
    tone: str
    voice_name: str
    voice_speed: float
    voice_pitch: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
