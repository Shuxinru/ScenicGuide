import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db, async_session
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import generate_rag_response
from app.services.analytics_service import log_event
from app.models.conversation import Conversation, Message

router = APIRouter()


async def _get_or_create_conversation(
    conversation_id: str | None,
    device_id: str,
    db: AsyncSession,
) -> Conversation:
    """Get existing conversation or create a new one."""
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalars().first()
        if conv:
            return conv

    conv = Conversation(
        id=str(uuid.uuid4()),
        device_id=device_id,
        title=None,
        message_count=0,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def _get_conversation_history(conversation_id: str, db: AsyncSession) -> list[dict]:
    """Retrieve recent messages from a conversation."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    messages = result.scalars().all()
    history = []
    for msg in reversed(messages):
        history.append({"role": msg.role, "content": msg.content})
    return history


@router.post("/chat/send", response_model=ChatResponse)
async def chat_send(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a message through the RAG pipeline and get a response."""
    device_id = req.device_id or "anonymous"

    # 1. Get or create conversation
    conv = await _get_or_create_conversation(req.conversation_id, device_id, db)

    # 2. Get conversation history
    history = await _get_conversation_history(conv.id, db)

    # 3. Save user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="user",
        content=req.text,
        sources=None,
        was_voice=False,
    )
    db.add(user_msg)
    conv.message_count += 1
    await db.commit()

    # 4. Generate RAG response
    rag_result = await generate_rag_response(
        question=req.text,
        conversation_history=history,
        user_interests=req.interests,
        db=db,
    )

    # 5. Save assistant message
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="assistant",
        content=rag_result["content"],
        sources=rag_result["sources"],
        was_voice=False,
    )
    db.add(assistant_msg)
    conv.message_count += 1
    await db.commit()

    # 6. Log analytics event
    await log_event(
        db=db,
        event_type="chat_message",
        event_data={"question": req.text, "has_sources": len(rag_result["sources"]) > 0},
        device_id=device_id,
        conversation_id=conv.id,
    )

    return ChatResponse(
        conversation_id=conv.id,
        message={
            "role": "assistant",
            "content": rag_result["content"],
            "sources": rag_result["sources"],
        },
    )


@router.websocket("/ws/chat/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for streaming chat."""
    await websocket.accept()

    async with async_session() as db:
        try:
            # Verify conversation exists or create new one
            result = await db.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conv = result.scalars().first()
            if not conv:
                await websocket.send_json({"error": "Conversation not found"})
                return

            while True:
                data = await websocket.receive_text()
                req_data = json.loads(data)
                text = req_data.get("text", "")
                interests = req_data.get("interests", [])
                device_id = req_data.get("device_id", "anonymous")

                # Send thinking indicator
                await websocket.send_json({"type": "thinking", "content": "正在思考..."})

                # Get history
                history = await _get_conversation_history(conversation_id, db)

                # Save user message
                user_msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="user",
                    content=text,
                )
                db.add(user_msg)
                conv.message_count += 1
                await db.commit()

                # Generate RAG response
                rag_result = await generate_rag_response(
                    question=text,
                    conversation_history=history,
                    user_interests=interests,
                    db=db,
                )

                # Save assistant message
                assistant_msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=conversation_id,
                    role="assistant",
                    content=rag_result["content"],
                    sources=rag_result["sources"],
                )
                db.add(assistant_msg)
                conv.message_count += 1
                await db.commit()

                # Stream response character by character (simulated)
                content = rag_result["content"]
                for i, char in enumerate(content):
                    chunk = {
                        "type": "chunk",
                        "content": char,
                        "index": i,
                        "total": len(content),
                    }
                    await websocket.send_json(chunk)

                # Send complete message
                await websocket.send_json({
                    "type": "complete",
                    "conversation_id": conversation_id,
                    "message": {
                        "role": "assistant",
                        "content": content,
                        "sources": rag_result["sources"],
                    },
                })

                # Log event
                await log_event(
                    db=db,
                    event_type="chat_message",
                    event_data={"question": text, "streaming": True},
                    device_id=device_id,
                    conversation_id=conversation_id,
                )

        except WebSocketDisconnect:
            pass
        except Exception as e:
            try:
                await websocket.send_json({"error": str(e)})
            except Exception:
                pass
