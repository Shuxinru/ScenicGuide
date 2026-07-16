from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/spots")
async def list_spots(db: AsyncSession = Depends(get_db)):
    """Return all scenic spots with metadata."""
    result = await db.execute(
        text("SELECT id, spot_code, spot_name, location, latitude, longitude, detailed_intro, highlights, open_info FROM scenic_spots WHERE scenic_area_name LIKE '%灵山%'")
    )
    spots = [dict(r._mapping) for r in result.fetchall()]
    return {"spots": spots}


@router.get("/routes")
async def list_routes(db: AsyncSession = Depends(get_db)):
    """Return all tour routes."""
    result = await db.execute(text("SELECT * FROM tour_routes"))
    routes = [dict(r._mapping) for r in result.fetchall()]
    return {"routes": routes}
