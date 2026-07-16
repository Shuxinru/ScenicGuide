import hashlib
import json
import os
import time

from sqlalchemy import func, select, or_, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tourist_behavior import TouristBehavior

# File-based persistent cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", ".cache", "consumption")
CACHE_TTL = 600  # 10 minutes

# 灵山胜境 sub-spots
LINGSHAN_SPOTS = [
    "佛足坛", "菩提大道", "九龙灌浴",
    "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
    "灵山大佛", "灵山梵宫", "五印坛城", "曼飞龙塔",
]


def _cache_key(prefix: str, **kwargs) -> str:
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    return hashlib.md5(f"{prefix}:{raw}".encode()).hexdigest()


def _cache_get(key: str):
    """Read from file-based persistent cache. Returns None if miss or expired."""
    try:
        path = os.path.join(CACHE_DIR, f"{key}.json")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            entry = json.load(f)
        if time.time() - entry["ts"] > CACHE_TTL:
            os.remove(path)
            return None
        return entry["data"]
    except Exception:
        return None


def _cache_set(key: str, value):
    """Write to file-based persistent cache."""
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        path = os.path.join(CACHE_DIR, f"{key}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"ts": time.time(), "data": value}, f, ensure_ascii=False)
    except Exception:
        pass


def _apply_filters(query, date_from=None, date_to=None, keyword=None, content_keywords=None):
    """Apply common filters to a query.

    keyword: LIKE match on attraction_name (uses idx_attraction_name)
    content_keywords: list of sub-spot names, FULLTEXT OR-matched on attraction_content
    """
    # Name filter (B-tree index)
    if keyword:
        kw = f"%{keyword}%"
        query = query.where(TouristBehavior.attraction_name.like(kw))
    # Content filter — FULLTEXT search, OR semantics: MATCH(content) AGAINST('spot1 spot2' IN BOOLEAN MODE)
    if content_keywords:
        terms = " ".join(content_keywords)
        query = query.where(
            sa_text("MATCH(attraction_content) AGAINST(:terms IN BOOLEAN MODE)")
        ).params(terms=terms)
    # Date filter
    if date_from:
        query = query.where(TouristBehavior.visit_date >= date_from)
    if date_to:
        query = query.where(TouristBehavior.visit_date <= date_to)
    return query


async def get_revenue_summary(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> dict:
    ck = _cache_key("summary", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    base = select(
        func.count(TouristBehavior.id).label("total_visitors"),
        func.sum(TouristBehavior.total_cost).label("total_revenue"),
        func.sum(TouristBehavior.ticket_cost).label("ticket_revenue"),
        func.sum(TouristBehavior.food_cost).label("food_revenue"),
        func.sum(TouristBehavior.shopping_cost).label("shopping_revenue"),
        func.sum(TouristBehavior.transport_cost).label("transport_revenue"),
        func.sum(TouristBehavior.entertainment_cost).label("entertainment_revenue"),
        func.avg(TouristBehavior.total_cost).label("avg_per_capita"),
        func.avg(TouristBehavior.stay_duration).label("avg_stay_duration"),
        func.avg(TouristBehavior.satisfaction).label("avg_satisfaction"),
    ).select_from(TouristBehavior)

    base = _apply_filters(base, date_from, date_to, keyword, content_keywords)
    result = await db.execute(base)
    row = result.fetchone()

    data = {
        "total_visitors": int(row.total_visitors or 0),
        "total_revenue": float(row.total_revenue or 0),
        "ticket_revenue": float(row.ticket_revenue or 0),
        "food_revenue": float(row.food_revenue or 0),
        "shopping_revenue": float(row.shopping_revenue or 0),
        "transport_revenue": float(row.transport_revenue or 0),
        "entertainment_revenue": float(row.entertainment_revenue or 0),
        "avg_per_capita": round(float(row.avg_per_capita or 0), 2),
        "avg_stay_duration": round(float(row.avg_stay_duration or 0), 2),
        "avg_satisfaction": round(float(row.avg_satisfaction or 0), 2),
    }
    _cache_set(ck, data)
    return data


async def get_revenue_trend(
    db: AsyncSession,
    granularity: str = "month",
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> list[dict]:
    ck = _cache_key("trend", granularity=granularity, date_from=date_from, date_to=date_to,
                     keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    if granularity == "month":
        label_expr = func.date_format(TouristBehavior.visit_date, "%Y-%m")
    else:
        label_expr = func.date_format(TouristBehavior.visit_date, "%Y-%m-%d")

    query = select(
        label_expr.label("period"),
        func.count(TouristBehavior.id).label("visitors"),
        func.sum(TouristBehavior.total_cost).label("total"),
        func.sum(TouristBehavior.ticket_cost).label("ticket"),
        func.sum(TouristBehavior.food_cost).label("food"),
        func.sum(TouristBehavior.shopping_cost).label("shopping"),
        func.sum(TouristBehavior.entertainment_cost).label("entertainment"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
    ).group_by(label_expr).order_by(label_expr).limit(366)

    query = _apply_filters(query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(query)
    data = [
        {
            "period": str(r.period),
            "visitors": int(r.visitors),
            "total": round(float(r.total or 0), 2),
            "ticket": round(float(r.ticket or 0), 2),
            "food": round(float(r.food or 0), 2),
            "shopping": round(float(r.shopping or 0), 2),
            "entertainment": round(float(r.entertainment or 0), 2),
            "avg_spend": round(float(r.avg_spend or 0), 2),
        }
        for r in result.fetchall()
    ]
    _cache_set(ck, data)
    return data


async def get_category_breakdown(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> dict:
    ck = _cache_key("category", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    base = select(
        func.sum(TouristBehavior.ticket_cost),
        func.sum(TouristBehavior.food_cost),
        func.sum(TouristBehavior.shopping_cost),
        func.sum(TouristBehavior.transport_cost),
        func.sum(TouristBehavior.entertainment_cost),
    ).select_from(TouristBehavior)

    base = _apply_filters(base, date_from, date_to, keyword, content_keywords)
    result = await db.execute(base)
    row = result.fetchone()

    ticket = float(row[0] or 0)
    food = float(row[1] or 0)
    shopping = float(row[2] or 0)
    transport = float(row[3] or 0)
    entertainment = float(row[4] or 0)
    total = ticket + food + shopping + transport + entertainment

    data = {
        "categories": [
            {"name": "门票", "value": round(ticket, 2), "pct": round(ticket / total * 100, 1) if total else 0},
            {"name": "餐饮", "value": round(food, 2), "pct": round(food / total * 100, 1) if total else 0},
            {"name": "购物", "value": round(shopping, 2), "pct": round(shopping / total * 100, 1) if total else 0},
            {"name": "交通", "value": round(transport, 2), "pct": round(transport / total * 100, 1) if total else 0},
            {"name": "娱乐", "value": round(entertainment, 2), "pct": round(entertainment / total * 100, 1) if total else 0},
        ],
        "total": round(total, 2),
    }
    _cache_set(ck, data)
    return data


async def get_age_gender_analysis(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> dict:
    ck = _cache_key("demo", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    def build_query(group_col):
        q = select(
            group_col,
            func.count(TouristBehavior.id).label("count"),
            func.avg(TouristBehavior.total_cost).label("avg_spend"),
            func.avg(TouristBehavior.satisfaction).label("avg_satisfaction"),
        ).group_by(group_col).order_by(group_col)
        return _apply_filters(q, date_from, date_to, keyword, content_keywords)

    # Gender analysis
    result = await db.execute(build_query(TouristBehavior.gender))
    gender_data = [
        {
            "gender": r[0],
            "count": int(r[1]),
            "avg_spend": round(float(r[2] or 0), 2),
            "avg_satisfaction": round(float(r[3] or 0), 2),
        }
        for r in result.fetchall()
    ]

    # Age group analysis
    age_expr = func.concat(func.floor(TouristBehavior.age / 10) * 10, "s")
    age_query = select(
        age_expr.label("age_group"),
        func.count(TouristBehavior.id).label("count"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
        func.avg(TouristBehavior.satisfaction).label("avg_satisfaction"),
    ).group_by(age_expr).order_by(age_expr)

    age_query = _apply_filters(age_query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(age_query)
    age_data = [
        {
            "age_group": r[0],
            "count": int(r[1]),
            "avg_spend": round(float(r[2] or 0), 2),
            "avg_satisfaction": round(float(r[3] or 0), 2),
        }
        for r in result.fetchall()
    ]

    # Group size analysis
    gs_query = select(
        TouristBehavior.group_size,
        func.count(TouristBehavior.id).label("count"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
        func.avg(TouristBehavior.stay_duration).label("avg_stay"),
    ).group_by(TouristBehavior.group_size).order_by(TouristBehavior.group_size)

    gs_query = _apply_filters(gs_query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(gs_query)
    group_size_data = [
        {
            "group_size": int(r[0]),
            "count": int(r[1]),
            "avg_spend": round(float(r[2] or 0), 2),
            "avg_stay": round(float(r[3] or 0), 2),
        }
        for r in result.fetchall()
    ]

    data = {
        "by_gender": gender_data,
        "by_age_group": age_data,
        "by_group_size": group_size_data,
    }
    _cache_set(ck, data)
    return data


async def get_attraction_type_revenue(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> list[dict]:
    ck = _cache_key("type_rev", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    query = select(
        TouristBehavior.attraction_type,
        func.count(TouristBehavior.id).label("visitors"),
        func.sum(TouristBehavior.total_cost).label("revenue"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
        func.avg(TouristBehavior.satisfaction).label("avg_satisfaction"),
    ).group_by(TouristBehavior.attraction_type).order_by(
        func.sum(TouristBehavior.total_cost).desc()
    )

    query = _apply_filters(query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(query)
    data = [
        {
            "attraction_type": r[0],
            "visitors": int(r[1]),
            "revenue": round(float(r[2] or 0), 2),
            "avg_spend": round(float(r[3] or 0), 2),
            "avg_satisfaction": round(float(r[4] or 0), 2),
        }
        for r in result.fetchall()
    ]
    _cache_set(ck, data)
    return data


async def get_satisfaction_spending(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> list[dict]:
    ck = _cache_key("sat", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    query = select(
        TouristBehavior.satisfaction,
        func.count(TouristBehavior.id).label("count"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
        func.avg(TouristBehavior.stay_duration).label("avg_stay"),
    ).group_by(TouristBehavior.satisfaction).order_by(TouristBehavior.satisfaction)

    query = _apply_filters(query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(query)
    data = [
        {
            "satisfaction": int(r[0]),
            "count": int(r[1]),
            "avg_spend": round(float(r[2] or 0), 2),
            "avg_stay": round(float(r[3] or 0), 2),
        }
        for r in result.fetchall()
    ]
    _cache_set(ck, data)
    return data


async def get_top_attractions(
    db: AsyncSession,
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
    limit: int = 15,
) -> list[dict]:
    ck = _cache_key("top", date_from=date_from, date_to=date_to, keyword=keyword, content_keywords=content_keywords, limit=limit)
    cached = _cache_get(ck)
    if cached:
        return cached

    query = select(
        TouristBehavior.attraction_name,
        TouristBehavior.attraction_type,
        func.count(TouristBehavior.id).label("visitors"),
        func.sum(TouristBehavior.total_cost).label("revenue"),
        func.avg(TouristBehavior.total_cost).label("avg_spend"),
        func.avg(TouristBehavior.satisfaction).label("avg_satisfaction"),
    ).group_by(
        TouristBehavior.attraction_name, TouristBehavior.attraction_type
    ).order_by(
        func.sum(TouristBehavior.total_cost).desc()
    ).limit(limit)

    query = _apply_filters(query, date_from, date_to, keyword, content_keywords)
    result = await db.execute(query)
    data = [
        {
            "name": r[0],
            "type": r[1],
            "visitors": int(r[2]),
            "revenue": round(float(r[3] or 0), 2),
            "avg_spend": round(float(r[4] or 0), 2),
            "avg_satisfaction": round(float(r[5] or 0), 2),
        }
        for r in result.fetchall()
    ]
    _cache_set(ck, data)
    return data


async def get_consumption_dashboard(
    db: AsyncSession,
    granularity: str = "month",
    date_from: str | None = None,
    date_to: str | None = None,
    keyword: str | None = None,
    content_keywords: list[str] | None = None,
) -> dict:
    """Single endpoint returning ALL consumption data at once."""
    ck = _cache_key("dashboard", granularity=granularity, date_from=date_from, date_to=date_to,
                     keyword=keyword, content_keywords=content_keywords)
    cached = _cache_get(ck)
    if cached:
        return cached

    # Sequential queries on single connection (avoids async connection conflicts, still fast)
    summary = await get_revenue_summary(db, date_from, date_to, keyword, content_keywords)
    trend = await get_revenue_trend(db, granularity, date_from, date_to, keyword, content_keywords)
    category = await get_category_breakdown(db, date_from, date_to, keyword, content_keywords)
    demographics = await get_age_gender_analysis(db, date_from, date_to, keyword, content_keywords)
    attraction_types = await get_attraction_type_revenue(db, date_from, date_to, keyword, content_keywords)
    sat_spend = await get_satisfaction_spending(db, date_from, date_to, keyword, content_keywords)
    top_attractions = await get_top_attractions(db, date_from, date_to, keyword, content_keywords, 15)

    # Per-spot breakdown when multiple sub-spots selected
    spot_breakdown = None
    if content_keywords and len(content_keywords) >= 1:
        spot_breakdown = []
        for spot in content_keywords:
            s = await get_revenue_summary(db, date_from, date_to, keyword, [spot])
            spot_breakdown.append({
                "spot": spot,
                "visitors": s["total_visitors"],
                "revenue": s["total_revenue"],
                "avg_spend": s["avg_per_capita"],
                "avg_satisfaction": s["avg_satisfaction"],
            })

    data = {
        "summary": summary,
        "trend": trend,
        "category": category,
        "demographics": demographics,
        "attraction_types": attraction_types,
        "satisfaction_spending": sat_spend,
        "top_attractions": top_attractions,
    }
    if spot_breakdown:
        data["spot_breakdown"] = spot_breakdown
    _cache_set(ck, data)
    return data
