import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings as app_settings

_chroma_client = None


def get_chroma_client() -> chromadb.Client:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.Client(
            ChromaSettings(
                persist_directory=app_settings.chroma_persist_dir,
                anonymized_telemetry=False,
            )
        )
    return _chroma_client


def get_or_create_collection(name: str):
    client = get_chroma_client()
    return client.get_or_create_collection(name=name)
