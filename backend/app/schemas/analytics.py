from datetime import datetime
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    visitors_today: int
    questions_today: int
    avg_satisfaction: float
    active_documents: int


class TrendData(BaseModel):
    date: str
    visitors: int | None = None
    count: int | None = None


class PopularQuestion(BaseModel):
    question: str
    count: int


class PeakTimeData(BaseModel):
    hour: int
    count: int


class SentimentBreakdown(BaseModel):
    sentiment_breakdown: dict
    sentiment_trend: list[dict]
    top_keywords: list[dict]
    avg_rating: float
    improvement_suggestions: list[str]


class FeedbackIn(BaseModel):
    conversation_id: str | None = None
    device_id: str | None = None
    rating: int | None = None
    comment: str | None = None


class FeedbackOut(BaseModel):
    id: str
    conversation_id: str | None
    device_id: str | None
    rating: int | None
    comment: str | None
    sentiment: str | None
    sentiment_score: float | None
    keywords: list | None
    created_at: datetime

    class Config:
        from_attributes = True
