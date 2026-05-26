from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_recommended_routes(
    interests: list[str],
    db: AsyncSession,
) -> list[dict]:
    """Query tour_routes table matching interest keywords."""
    if not interests:
        query = sa_text("SELECT * FROM tour_routes LIMIT 5")
        result = await db.execute(query)
        return [dict(r._mapping) for r in result.fetchall()]

    conditions = " OR ".join(["description LIKE :kw%d" % i for i in range(len(interests))])
    params = {f"kw{i}": f"%{kw}%" for i, kw in enumerate(interests)}
    query = sa_text(f"SELECT * FROM tour_routes WHERE {conditions} LIMIT 10")
    result = await db.execute(query, params)
    rows = result.fetchall()
    return [dict(r._mapping) for r in rows]


def build_interest_context(interests: list[str]) -> str:
    """Build a prompt snippet for personalized response based on user interests."""
    if not interests:
        return ""

    interest_list = "、".join(interests)
    return (
        f"当前游客对以下内容感兴趣：{interest_list}。"
        "请在回答时尽量围绕这些兴趣点提供相关信息和建议。"
    )
