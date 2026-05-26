import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query
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
    x_device_id: str = Header(default=None, alias="X-Device-ID"),
    db: AsyncSession = Depends(get_db),
):
    """Submit a rating + comment, trigger sentiment analysis. One rating per conversation."""
    device_id = req.device_id or x_device_id

    # Prevent duplicate ratings for the same conversation
    if req.conversation_id:
        existing = await db.execute(
            select(Feedback).where(Feedback.conversation_id == req.conversation_id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail="该对话已经评价过了")

    sentiment_result = {"sentiment": None, "score": None}
    keywords = []

    if req.comment:
        try:
            sentiment_result = await analyze_sentiment(req.comment)
            keywords = await extract_keywords(req.comment)
        except Exception:
            pass

    feedback = Feedback(
        id=str(uuid.uuid4()),
        conversation_id=req.conversation_id,
        device_id=device_id,
        rating=req.rating,
        comment=req.comment,
        sentiment=sentiment_result.get("sentiment"),
        sentiment_score=sentiment_result.get("score"),
        keywords=keywords or [],
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/feedback")
async def list_feedback(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sentiment: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List feedback with filters and pagination."""
    offset = (page - 1) * page_size

    base_query = select(Feedback)
    count_query = select(func.count(Feedback.id))

    if sentiment:
        base_query = base_query.where(Feedback.sentiment == sentiment)
        count_query = count_query.where(Feedback.sentiment == sentiment)
    if date_from:
        base_query = base_query.where(func.date(Feedback.created_at) >= date_from)
        count_query = count_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        base_query = base_query.where(func.date(Feedback.created_at) <= date_to)
        count_query = count_query.where(func.date(Feedback.created_at) <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        base_query
        .order_by(Feedback.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/feedback/report")
async def feedback_report(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get sentiment analysis report for feedback."""
    return await generate_report(db, date_from, date_to)
