import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.feedback import Feedback
from app.schemas.analytics import FeedbackIn, FeedbackOut
from app.services.sentiment_service import analyze_sentiment, extract_keywords, generate_report

router = APIRouter()


@router.post("/feedback", response_model=FeedbackOut)
async def submit_feedback(
    req: FeedbackIn,
    db: AsyncSession = Depends(get_db),
):
    """Submit a rating + comment, trigger sentiment analysis."""
    sentiment_result = {"sentiment": None, "score": None}
    keywords = []

    if req.comment:
        sentiment_result = await analyze_sentiment(req.comment)
        keywords = await extract_keywords(req.comment)

    feedback = Feedback(
        id=str(uuid.uuid4()),
        conversation_id=req.conversation_id,
        device_id=req.device_id,
        rating=req.rating,
        comment=req.comment,
        sentiment=sentiment_result.get("sentiment"),
        sentiment_score=sentiment_result.get("score"),
        keywords=keywords,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/feedback", response_model=list[FeedbackOut])
async def list_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sentiment: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List feedback with filters."""
    offset = (page - 1) * page_size
    query = select(Feedback).order_by(Feedback.created_at.desc())

    if sentiment:
        query = query.where(Feedback.sentiment == sentiment)
    if date_from:
        query = query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(query.offset(offset).limit(page_size))
    return result.scalars().all()


@router.get("/feedback/report")
async def feedback_report(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get sentiment analysis report for feedback."""
    return await generate_report(db, date_from, date_to)
