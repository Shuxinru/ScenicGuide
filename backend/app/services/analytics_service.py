from datetime import date, datetime

from sqlalchemy import text as sa_text, func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent
from app.models.conversation import Conversation
from app.models.feedback import Feedback
from app.models.knowledge import KnowledgeDocument


async def get_dashboard_summary(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Get dashboard summary: today's visitors, questions, avg satisfaction, active docs."""
    today = date.today()

    # Visitors today (distinct device_ids that started conversations today)
    result = await db.execute(
        select(func.count(func.distinct(Conversation.device_id)))
        .where(func.date(Conversation.created_at) == today)
    )
    visitors_today = result.scalar() or 0

    # Questions today (chat_message events)
    result = await db.execute(
        select(func.count(AnalyticsEvent.id))
        .where(
            AnalyticsEvent.event_type == "chat_message",
            func.date(AnalyticsEvent.created_at) == today,
        )
    )
    questions_today = result.scalar() or 0

    # Avg satisfaction today
    result = await db.execute(
        select(func.avg(Feedback.rating))
        .where(func.date(Feedback.created_at) == today)
    )
    avg_rating = result.scalar()
    avg_satisfaction = round(float(avg_rating), 2) if avg_rating else 0.0

    # Active documents
    result = await db.execute(
        select(func.count(KnowledgeDocument.id))
        .where(KnowledgeDocument.status == "completed")
    )
    active_docs = result.scalar() or 0

    return {
        "visitors_today": visitors_today,
        "questions_today": questions_today,
        "avg_satisfaction": avg_satisfaction,
        "active_documents": active_docs,
    }


async def get_visitor_trend(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict]:
    """Get daily visitor counts."""
    query = (
        select(
            func.date(AnalyticsEvent.created_at).label("date"),
            func.count(func.distinct(AnalyticsEvent.device_id)).label("visitors"),
        )
        .group_by(func.date(AnalyticsEvent.created_at))
        .order_by(func.date(AnalyticsEvent.created_at).desc())
        .limit(30)
    )

    if date_from:
        query = query.where(func.date(AnalyticsEvent.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AnalyticsEvent.created_at) <= date_to)

    result = await db.execute(query)
    return [{"date": str(r.date), "visitors": r.visitors} for r in result.fetchall()]


async def get_popular_questions(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """Get most asked questions from analytics events."""
    query = (
        select(
            AnalyticsEvent.event_data["question"].as_string().label("question"),
            func.count(AnalyticsEvent.id).label("count"),
        )
        .where(
            AnalyticsEvent.event_type == "chat_message",
            AnalyticsEvent.event_data["question"].as_string() != None,
        )
        .group_by(AnalyticsEvent.event_data["question"].as_string())
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(limit)
    )

    if date_from:
        query = query.where(func.date(AnalyticsEvent.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AnalyticsEvent.created_at) <= date_to)

    try:
        result = await db.execute(query)
        return [{"question": r.question, "count": r.count} for r in result.fetchall()]
    except Exception:
        return []


async def get_peak_times(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict]:
    """Get hourly activity heatmap data."""
    query = (
        select(
            func.hour(AnalyticsEvent.created_at).label("hour"),
            func.count(AnalyticsEvent.id).label("count"),
        )
        .group_by(func.hour(AnalyticsEvent.created_at))
        .order_by(func.hour(AnalyticsEvent.created_at))
    )

    if date_from:
        query = query.where(func.date(AnalyticsEvent.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AnalyticsEvent.created_at) <= date_to)

    try:
        result = await db.execute(query)
        return [{"hour": r.hour, "count": r.count} for r in result.fetchall()]
    except Exception:
        return []


async def log_event(
    db: AsyncSession,
    event_type: str,
    event_data: dict | None = None,
    device_id: str | None = None,
    conversation_id: str | None = None,
) -> None:
    """Insert an analytics event."""
    import uuid
    event = AnalyticsEvent(
        id=str(uuid.uuid4()),
        event_type=event_type,
        event_data=event_data or {},
        device_id=device_id,
        conversation_id=conversation_id,
    )
    db.add(event)
    await db.commit()
