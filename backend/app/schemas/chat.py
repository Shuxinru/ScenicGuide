from pydantic import BaseModel


class ChatRequest(BaseModel):
    text: str
    conversation_id: str | None = None
    interests: list[str] = []
    device_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    message: dict  # {role, content, sources}
