import json

from sqlalchemy import text as sa_text, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.llm_service import llm_service
from app.models.feedback import Feedback


async def analyze_sentiment(text: str) -> dict:
    """Classify sentiment as positive/neutral/negative with score using LLM."""
    system_prompt = (
        "你是一个情感分析专家。请分析以下文本的情感倾向，"
        "返回JSON格式：{\"sentiment\": \"positive|neutral|negative\", \"score\": 0.0-1.0}"
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text},
    ]
    try:
        response = await llm_service.generate(messages, temperature=0.1, max_tokens=128)
        result = json.loads(response.strip())
        return {
            "sentiment": result.get("sentiment", "neutral"),
            "score": float(result.get("score", 0.5)),
        }
    except Exception:
        return {"sentiment": "neutral", "score": 0.5}


async def extract_keywords(text: str) -> list[str]:
    """Extract key topics from feedback using LLM."""
    system_prompt = (
        "你是一个文本关键词提取专家。请从以下文本中提取5个以内的关键主题词，"
        "返回JSON数组格式：[\"词1\", \"词2\", ...]"
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text},
    ]
    try:
        response = await llm_service.generate(messages, temperature=0.1, max_tokens=128)
        keywords = json.loads(response.strip())
        if isinstance(keywords, list):
            return keywords[:5]
        return []
    except Exception:
        return []


async def generate_report(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Generate sentiment breakdown, trends, top keywords, and improvement suggestions."""

    # Sentiment breakdown
    base_query = select(
        Feedback.sentiment,
        func.count(Feedback.id).label("count"),
        func.avg(Feedback.sentiment_score).label("avg_score"),
    ).group_by(Feedback.sentiment)

    if date_from:
        base_query = base_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        base_query = base_query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(base_query)
    breakdown = {}
    for r in result.fetchall():
        sentiment = r.sentiment or "neutral"
        breakdown[sentiment] = {
            "count": r.count,
            "avg_score": round(float(r.avg_score) if r.avg_score else 0.0, 2),
        }

    # Daily sentiment trend
    trend_query = (
        select(
            func.date(Feedback.created_at).label("date"),
            Feedback.sentiment,
            func.count(Feedback.id).label("count"),
        )
        .group_by(func.date(Feedback.created_at), Feedback.sentiment)
        .order_by(func.date(Feedback.created_at).desc())
        .limit(30)
    )

    if date_from:
        trend_query = trend_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        trend_query = trend_query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(trend_query)
    trend_data = []
    for r in result.fetchall():
        trend_data.append({
            "date": str(r.date),
            "sentiment": r.sentiment,
            "count": r.count,
        })

    # Top keywords
    keyword_query = (
        select(Feedback.keywords)
        .where(Feedback.keywords != None)
        .order_by(Feedback.created_at.desc())
        .limit(100)
    )

    if date_from:
        keyword_query = keyword_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        keyword_query = keyword_query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(keyword_query)
    keyword_counts = {}
    for r in result.fetchall():
        for kw in (r[0] or []):
            keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

    top_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:20]

    # Average rating
    rating_query = select(func.avg(Feedback.rating))
    if date_from:
        rating_query = rating_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        rating_query = rating_query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(rating_query)
    avg_rating = result.scalar()
    avg_rating = round(float(avg_rating), 2) if avg_rating else 0.0

    # Improvement suggestions based on negative feedback
    suggestions_query = select(Feedback.comment).where(
        Feedback.sentiment == "negative",
        Feedback.comment != None,
        Feedback.comment != "",
    )
    if date_from:
        suggestions_query = suggestions_query.where(func.date(Feedback.created_at) >= date_from)
    if date_to:
        suggestions_query = suggestions_query.where(func.date(Feedback.created_at) <= date_to)

    result = await db.execute(suggestions_query.limit(20))
    negative_comments = [r[0] for r in result.fetchall() if r[0]]

    suggestions = []
    if negative_comments:
        combined = "\n".join(negative_comments)
        prompt = (
            "根据以下用户负面反馈，请总结3条具体的改进建议，用JSON数组格式返回："
            "[\"建议1\", \"建议2\", \"建议3\"]\n\n" + combined
        )
        try:
            msgs = [
                {"role": "system", "content": "你是一个景区服务质量改进顾问。"},
                {"role": "user", "content": prompt},
            ]
            response = await llm_service.generate(msgs, temperature=0.3, max_tokens=256)
            suggestions = json.loads(response.strip())
            if not isinstance(suggestions, list):
                suggestions = []
        except Exception:
            suggestions = []

    return {
        "sentiment_breakdown": breakdown,
        "sentiment_trend": trend_data,
        "top_keywords": [{"keyword": kw, "count": cnt} for kw, cnt in top_keywords],
        "avg_rating": avg_rating,
        "improvement_suggestions": suggestions,
    }
