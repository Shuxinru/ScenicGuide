from fastapi import APIRouter

from app.api import chat, knowledge, analytics, feedback, avatar, auth

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(knowledge.router, tags=["knowledge"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(feedback.router, tags=["feedback"])
api_router.include_router(avatar.router, tags=["avatar"])
