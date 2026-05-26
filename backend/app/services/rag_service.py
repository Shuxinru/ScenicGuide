import json
from typing import Any

from sqlalchemy import select, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.services.llm_service import llm_service
from app.services.embedding_service import embedding_service
from app.services.recommendation_service import build_interest_context
from app.core.vector_store import get_or_create_collection
from app.models.knowledge import KnowledgeChunk, QAPair
from app.models.avatar import AvatarConfig


def _build_system_prompt(
    persona_prompt: str,
    context_chunks: list[str],
    matched_qa: list[str],
    scenic_data: str,
    interest_context: str,
) -> str:
    parts = [persona_prompt]

    if context_chunks:
        parts.append("## 参考资料\n" + "\n\n".join(context_chunks))

    if matched_qa:
        parts.append("## 相关问答\n" + "\n\n".join(matched_qa))

    if scenic_data:
        parts.append("## 景区数据\n" + scenic_data)

    if interest_context:
        parts.append("## 游客偏好\n" + interest_context)

    parts.append(
        "请根据以上信息，用热情友好的中文回答用户的问题。"
        "如果参考资料中有相关信息，请优先基于参考资料回答。"
        "如果无法从参考资料中找到答案，请如实告知并根据自己的知识提供帮助。"
    )

    return "\n\n".join(parts)


async def _search_chromadb(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """Search ChromaDB for similar chunks."""
    collection = get_or_create_collection("scenic_knowledge")
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    if not results["ids"] or not results["ids"][0]:
        return []

    chunks = []
    for i, chunk_id in enumerate(results["ids"][0]):
        metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
        distance = results["distances"][0][i] if results.get("distances") else 0.0
        score = 1.0 - distance if distance <= 1.0 else 1.0 / (1.0 + distance)
        chunks.append({
            "chunk_id": chunk_id,
            "document_title": metadata.get("document_title", "未知"),
            "content": results["documents"][0][i] if results.get("documents") else "",
            "score": round(score, 4),
        })
    return chunks


async def _search_qa_keywords(question: str, db: AsyncSession) -> list[dict]:
    """Search Q&A pairs for exact keyword matches."""
    keywords = [w.strip() for w in question if len(w.strip()) >= 2]
    if not keywords:
        return []

    conditions = []
    for kw in keywords[:5]:  # use up to 5 keywords
        conditions.append(QAPair.question.contains(kw))
        conditions.append(QAPair.question_key.contains(kw))

    from sqlalchemy import or_
    result = await db.execute(
        select(QAPair)
        .where(or_(*conditions, QAPair.is_active == True))
        .limit(10)
    )
    qa_list = []
    for qa in result.scalars().all():
        qa_list.append({
            "id": qa.id,
            "question": qa.question,
            "answer": qa.answer,
        })
    return qa_list


async def _query_scenic_data(db: AsyncSession, keywords: list[str]) -> str:
    """Query MySQL for relevant scenic area data."""
    data_parts = []

    # Try to find scenic spots
    for table_name in ["scenic_spots", "tour_routes", "facilities", "events"]:
        try:
            query = sa_text(f"SELECT * FROM {table_name} LIMIT 5")
            result = await db.execute(query)
            rows = result.fetchall()
            if rows:
                data_parts.append(f"表 {table_name}: {json.dumps([dict(r._mapping) for r in rows], ensure_ascii=False, default=str)}")
        except Exception:
            pass

    return "\n".join(data_parts)


async def retrieve_context(
    question: str,
    db: AsyncSession,
    top_k: int = 10,
) -> tuple[list[dict], list[dict], str]:
    """Retrieve relevant context from all sources."""
    query_embedding = await embedding_service.embed_query(question)

    # Search ChromaDB
    chroma_chunks = await _search_chromadb(query_embedding, top_k=top_k)

    # Search Q&A pairs
    qa_matches = await _search_qa_keywords(question, db)

    # Query scenic data
    scenic_data = await _query_scenic_data(db, [])

    return chroma_chunks, qa_matches, scenic_data


async def generate_rag_response(
    question: str,
    conversation_history: list[dict],
    user_interests: list[str],
    db: AsyncSession,
) -> dict:
    """Full RAG pipeline: retrieve context and generate response."""

    # 1. Retrieve context
    chroma_chunks, qa_matches, scenic_data = await retrieve_context(question, db, top_k=10)

    # 2. Get avatar persona prompt
    result = await db.execute(select(AvatarConfig).limit(1))
    avatar_config = result.scalars().first()
    persona_prompt = avatar_config.persona_prompt if avatar_config else (
        "你是一个热情、知识渊博的景区导览助手。请用简洁友好的中文回答游客的问题。"
    )

    # 3. Build context chunks text
    top_chunks = chroma_chunks[:5]
    context_texts = []
    for c in top_chunks:
        context_texts.append(f"【{c['document_title']}】\n{c['content']}")

    # 4. Build matched Q&A text
    qa_texts = []
    for qa in qa_matches[:5]:
        qa_texts.append(f"问: {qa['question']}\n答: {qa['answer']}")

    # 5. Build interest context
    interest_context = build_interest_context(user_interests) if user_interests else ""

    # 6. Build system prompt
    system_prompt = _build_system_prompt(
        persona_prompt=persona_prompt,
        context_chunks=context_texts,
        matched_qa=qa_texts,
        scenic_data=scenic_data,
        interest_context=interest_context,
    )

    # 7. Build messages
    messages = [{"role": "system", "content": system_prompt}]

    # Include last 6 messages from history
    if conversation_history:
        messages.extend(conversation_history[-6:])

    messages.append({"role": "user", "content": question})

    # 8. Generate response
    response_text = await llm_service.generate(
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )

    # 9. Build sources
    sources = [
        {"chunk_id": c["chunk_id"], "document_title": c["document_title"], "score": c["score"]}
        for c in top_chunks
    ]

    return {
        "content": response_text,
        "sources": sources,
    }
