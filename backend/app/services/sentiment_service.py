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
    """Generate a complete feedback report with rates, distributions, trends, and AI insights."""

    # Build shared date filter
    def apply_date_filter(query, col=Feedback.created_at):
        if date_from:
            query = query.where(func.date(col) >= date_from)
        if date_to:
            query = query.where(func.date(col) <= date_to)
        return query

    # Total count and avg rating
    count_query = select(func.count(Feedback.id), func.avg(Feedback.rating))
    count_query = apply_date_filter(count_query)
    result = await db.execute(count_query)
    total_feedback, avg_rating = result.fetchone()
    total_feedback = total_feedback or 0
    avg_rating = round(float(avg_rating), 2) if avg_rating else 0.0

    # Sentiment counts for rates
    sent_query = select(
        Feedback.sentiment,
        func.count(Feedback.id).label("count"),
    ).group_by(Feedback.sentiment)
    sent_query = apply_date_filter(sent_query)
    result = await db.execute(sent_query)
    sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
    for r in result.fetchall():
        label = r.sentiment or "neutral"
        sentiment_counts[label] = r.count

    positive_rate = round(sentiment_counts["positive"] / total_feedback, 4) if total_feedback else 0
    neutral_rate = round(sentiment_counts["neutral"] / total_feedback, 4) if total_feedback else 0
    negative_rate = round(sentiment_counts["negative"] / total_feedback, 4) if total_feedback else 0

    # Rating distribution (count per rating 1-5)
    dist_query = select(
        Feedback.rating,
        func.count(Feedback.id).label("count"),
    ).group_by(Feedback.rating)
    dist_query = apply_date_filter(dist_query)
    result = await db.execute(dist_query)
    dist_map = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in result.fetchall():
        if r.rating in dist_map:
            dist_map[r.rating] = r.count
    rating_distribution = [{"rating": k, "count": v} for k, v in dist_map.items()]

    # Top keywords
    kw_query = (
        select(Feedback.keywords)
        .where(Feedback.keywords != None)
        .order_by(Feedback.created_at.desc())
        .limit(100)
    )
    kw_query = apply_date_filter(kw_query)
    result = await db.execute(kw_query)
    keyword_freq = {}
    for r in result.fetchall():
        for kw in (r[0] or []):
            keyword_freq[kw] = keyword_freq.get(kw, 0) + 1
    top_keywords = [kw for kw, _ in sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:15]]

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
    trend_query = apply_date_filter(trend_query)
    result = await db.execute(trend_query)
    sentiment_trend = []
    for r in result.fetchall():
        sentiment_trend.append({
            "date": str(r.date),
            "sentiment": r.sentiment or "neutral",
            "count": r.count,
        })

    # Improvement suggestions from negative feedback
    neg_query = select(Feedback.comment).where(
        Feedback.sentiment == "negative",
        Feedback.comment != None,
        Feedback.comment != "",
    )
    neg_query = apply_date_filter(neg_query)
    result = await db.execute(neg_query.limit(20))
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
            parsed = json.loads(response.strip())
            if isinstance(parsed, list):
                suggestions = parsed
        except Exception:
            pass

    # AI insights summary
    insights = ""
    if total_feedback > 0:
        insight_prompt = (
            f"根据以下景区导览服务的游客反馈数据，请生成一段200字以内的智能分析报告，"
            f"包含整体评价趋势、主要关注点和改进方向：\n"
            f"总反馈数: {total_feedback}, 平均评分: {avg_rating}/5, "
            f"好评率: {round(positive_rate*100,1)}%, 差评率: {round(negative_rate*100,1)}%, "
            f"热门关键词: {', '.join(top_keywords[:10])}"
        )
        try:
            msgs = [
                {"role": "system", "content": "你是一个景区服务质量数据分析师，请用中文回复，不使用markdown格式。"},
                {"role": "user", "content": insight_prompt},
            ]
            insights = await llm_service.generate(msgs, temperature=0.5, max_tokens=400)
            insights = insights.strip()
        except Exception:
            insights = "暂无足够数据生成AI分析报告。"

    from datetime import datetime
    return {
        "total_feedback": total_feedback,
        "avg_rating": avg_rating,
        "positive_rate": positive_rate,
        "neutral_rate": neutral_rate,
        "negative_rate": negative_rate,
        "rating_distribution": rating_distribution,
        "top_keywords": top_keywords,
        "insights": insights,
        "sentiment_trend": sentiment_trend,
        "improvement_suggestions": suggestions,
        "date_from": date_from or "",
        "date_to": date_to or "",
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
