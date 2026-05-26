from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.analytics import AnalyticsEvent
from app.schemas.analytics import DashboardSummary, TrendData, PopularQuestion, PeakTimeData
from app.services.analytics_service import (
    get_dashboard_summary,
    get_visitor_trend,
    get_popular_questions,
    get_peak_times,
)
from app.services.sentiment_service import generate_report

router = APIRouter()


@router.get("/analytics/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard summary statistics."""
    return await get_dashboard_summary(db, date_from, date_to)


@router.get("/analytics/dashboard/visitor-trend")
async def visitor_trend(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get daily visitor counts."""
    return await get_visitor_trend(db, date_from, date_to)


@router.get("/analytics/dashboard/popular-questions")
async def popular_questions(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get most asked questions."""
    return await get_popular_questions(db, date_from, date_to, limit)


@router.get("/analytics/dashboard/peak-times")
async def peak_times(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get hourly activity heatmap data."""
    return await get_peak_times(db, date_from, date_to)


@router.get("/analytics/dashboard/sentiment")
async def sentiment_report(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get sentiment analysis report."""
    return await generate_report(db, date_from, date_to)


@router.get("/analytics/dashboard/conversation-volume")
async def conversation_volume(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get daily conversation activity counts."""
    query = (
        select(
            func.date(AnalyticsEvent.created_at).label("date"),
            func.count(AnalyticsEvent.id).label("count"),
        )
        .where(AnalyticsEvent.event_type == "chat_message")
        .group_by(func.date(AnalyticsEvent.created_at))
        .order_by(func.date(AnalyticsEvent.created_at).desc())
        .limit(30)
    )

    if date_from:
        query = query.where(func.date(AnalyticsEvent.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AnalyticsEvent.created_at) <= date_to)

    result = await db.execute(query)
    return [{"date": str(r.date), "count": r.count} for r in result.fetchall()]
