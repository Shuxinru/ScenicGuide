from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from app.config import settings


def setup_cors(app: FastAPI) -> None:
    origins = [o.strip() for o in settings.cors_origins.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
