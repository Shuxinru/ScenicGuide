"""
Ingest all scenic area data from MySQL into ChromaDB vector store.

Run: python -m scripts.ingest_scenic_data  (from backend directory)
"""

import asyncio
import hashlib
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text as sa_text
from app.core.database import async_session, engine
from app.services.embedding_service import embedding_service
from app.core.vector_store import get_or_create_collection


# Table configs: (table_name, label, columns to fetch, how to format each row)
TABLE_CONFIGS = [
    {
        "table": "scenic_spots",
        "label": "景点信息",
        "columns": [
            "scenic_area_name", "spot_name", "location", "detailed_intro",
            "highlights", "open_info", "cultural_connotation", "core_function",
        ],
    },
    {
        "table": "ticket_policies",
        "label": "票务信息",
        "columns": ["ticket_type", "price", "target_audience"],
    },
    {
        "table": "tour_routes",
        "label": "游览路线",
        "columns": ["route_type", "duration", "path", "key_points", "experiences"],
    },
    {
        "table": "scenic_overview",
        "label": "景区概览",
        "columns": ["location", "area", "level", "history", "culture"],
    },
    {
        "table": "cultural_shturl",
        "label": "文化资料",
        "columns": ["culture_type", "content"],
    },
    {
        "table": "history_shturl",
        "label": "历史资料",
        "columns": ["period", "event", "detail"],
    },
    {
        "table": "performance_shturl",
        "label": "演出信息",
        "columns": ["show_name", "location", "show_time", "duration", "note"],
    },
    {
        "table": "travel_shturl",
        "label": "旅游贴士",
        "columns": ["tip_category", "content"],
    },
]


def _row_to_text(label: str, row_dict: dict) -> str:
    """Convert a DB row to a natural-language text chunk."""
    parts = [f"【{label}】"]
    for key, value in row_dict.items():
        if value is not None and str(value).strip():
            parts.append(f"{key}: {value}")
    return "\n".join(parts)


async def ingest_all():
    collection = get_or_create_collection("scenic_knowledge")
    existing_count = collection.count()
    print(f"ChromaDB collection 'scenic_knowledge' current count: {existing_count}")

    total_chunks = 0

    async with async_session() as db:
        for config in TABLE_CONFIGS:
            table = config["table"]
            label = config["label"]
            columns = config["columns"]
            col_str = ", ".join(columns)

            # Check if table exists
            try:
                check = await db.execute(
                    sa_text(f"SELECT COUNT(*) FROM {table}")
                )
                row_count = check.scalar() or 0
            except Exception as e:
                print(f"  SKIP {table}: {e}")
                continue

            if row_count == 0:
                print(f"  {table} ({label}): empty, skip")
                continue

            print(f"  Processing {table} ({label}): {row_count} rows...")

            result = await db.execute(
                sa_text(f"SELECT {col_str} FROM {table}")
            )
            rows = result.fetchall()

            texts = []
            metadatas = []
            ids = []

            for row in rows:
                row_dict = dict(row._mapping)
                # Skip rows with all nulls
                non_null = {k: v for k, v in row_dict.items() if v is not None and str(v).strip()}
                if not non_null:
                    continue

                text = _row_to_text(label, non_null)
                # Generate deterministic chunk ID from content hash
                chunk_id = hashlib.md5(f"{table}:{json.dumps(row_dict, default=str, sort_keys=True)}".encode()).hexdigest()

                texts.append(text)
                metadatas.append({
                    "source_table": table,
                    "document_title": label,
                    "row_data": json.dumps(row_dict, ensure_ascii=False, default=str),
                })
                ids.append(chunk_id)

            if not texts:
                print(f"    No valid rows after filtering")
                continue

            # Generate embeddings in batches
            batch_size = 32
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                batch_ids = ids[i:i + batch_size]
                batch_meta = metadatas[i:i + batch_size]

                try:
                    embeddings = embedding_service.embed_texts(batch_texts)
                    collection.add(
                        ids=batch_ids,
                        embeddings=embeddings,
                        documents=batch_texts,
                        metadatas=batch_meta,
                    )
                    total_chunks += len(batch_texts)
                except Exception as e:
                    print(f"    Batch {i // batch_size} failed: {e}")
                    # Try upsert instead
                    try:
                        collection.upsert(
                            ids=batch_ids,
                            embeddings=embeddings,
                            documents=batch_texts,
                            metadatas=batch_meta,
                        )
                        total_chunks += len(batch_texts)
                    except Exception as e2:
                        print(f"    Upsert also failed: {e2}")

    print(f"\nDone! Total chunks ingested: {total_chunks}")
    print(f"Collection count: {collection.count()}")


if __name__ == "__main__":
    asyncio.run(ingest_all())
