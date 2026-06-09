import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.security import setup_cors
from app.core.database import check_db_connection, engine, Base
from app.config import settings

# Import all models so Base.metadata.create_all can create tables
import app.models.knowledge  # noqa
import app.models.conversation  # noqa
import app.models.feedback  # noqa
import app.models.avatar  # noqa
import app.models.analytics  # noqa
import app.models.admin  # noqa
import app.models.settings  # noqa

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_ok = await check_db_connection()
    if db_ok:
        print(f"[OK] MySQL connected: {settings.db_host}:{settings.db_port}/{settings.db_name}")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Add clothing_url column if upgrading from older schema
            try:
                await conn.execute(
                    __import__("sqlalchemy").text(
                        "ALTER TABLE avatar_configs ADD COLUMN clothing_url VARCHAR(500) NULL"
                    )
                )
            except Exception:
                pass  # Column already exists
        print(f"[OK] Database tables verified/created")
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

# Serve uploaded static files
app.mount("/api/v1/static", StaticFiles(directory=UPLOAD_DIR), name="static")


@app.get("/api/v1/health")
async def health_check():
    db_ok = await check_db_connection()
    return {
        "status": "ok",
        "service": "ai-digital-human",
        "scenic_area": settings.scenic_area_name,
        "database": "connected" if db_ok else "disconnected",
    }
