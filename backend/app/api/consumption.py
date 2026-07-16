from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.consumption_service import (
    get_revenue_summary,
    get_revenue_trend,
    get_category_breakdown,
    get_age_gender_analysis,
    get_attraction_type_revenue,
    get_satisfaction_spending,
    get_top_attractions,
    get_consumption_dashboard,
    LINGSHAN_SPOTS,
)

router = APIRouter()


def _parse_keywords(content_keywords: str | None) -> list[str] | None:
    """Split comma-separated keywords string into list."""
    if not content_keywords:
        return None
    return [kw.strip() for kw in content_keywords.split(",") if kw.strip()]


@router.get("/consumption/dashboard")
async def consumption_dashboard(
    granularity: str = Query("month", pattern="^(month|day)$"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None, description="Filter by attraction name"),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    """Single endpoint returning ALL consumption data. One DB connection, one response."""
    ck = _parse_keywords(content_keywords)
    return await get_consumption_dashboard(db, granularity, date_from, date_to, keyword, ck)


@router.get("/consumption/summary")
async def consumption_summary(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None, description="Filter by attraction name"),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_revenue_summary(db, date_from, date_to, keyword, ck)


@router.get("/consumption/trend")
async def consumption_trend(
    granularity: str = Query("month", pattern="^(month|day)$"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_revenue_trend(db, granularity, date_from, date_to, keyword, ck)


@router.get("/consumption/category-breakdown")
async def consumption_category_breakdown(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_category_breakdown(db, date_from, date_to, keyword, ck)


@router.get("/consumption/demographics")
async def consumption_demographics(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_age_gender_analysis(db, date_from, date_to, keyword, ck)


@router.get("/consumption/by-attraction-type")
async def consumption_by_attraction_type(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_attraction_type_revenue(db, date_from, date_to, keyword, ck)


@router.get("/consumption/satisfaction-spending")
async def consumption_satisfaction_spending(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_satisfaction_spending(db, date_from, date_to, keyword, ck)


@router.get("/consumption/top-attractions")
async def consumption_top_attractions(
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    keyword: str | None = Query(None),
    content_keywords: str | None = Query(None, description="Comma-separated sub-spot names"),
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    ck = _parse_keywords(content_keywords)
    return await get_top_attractions(db, date_from, date_to, keyword, ck, limit)


@router.get("/consumption/spots")
async def consumption_spots():
    """Return the list of Lingshan sub-spots for the filter UI."""
    return {"spots": LINGSHAN_SPOTS}
