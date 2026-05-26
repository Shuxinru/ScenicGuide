from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.security import setup_cors
from app.core.database import check_db_connection
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_ok = await check_db_connection()
    if db_ok:
        print(f"[OK] MySQL connected: {settings.db_host}:{settings.db_port}/{settings.db_name}")
    else:
        print(f"[WARN] MySQL connection failed. Check .env config.")
    yield


app = FastAPI(
    title="AI Digital Human Platform",
    description="Scenic Area Tour Guide AI Digital Human Service",
    version="1.0.0",
    lifespan=lifespan,
)

setup_cors(app)
app.include_router(api_router)


@app.get("/api/v1/health")
async def health_check():
    db_ok = await check_db_connection()
    return {
        "status": "ok",
        "service": "ai-digital-human",
        "scenic_area": settings.scenic_area_name,
        "database": "connected" if db_ok else "disconnected",
    }
