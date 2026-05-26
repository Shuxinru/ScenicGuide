import json
import re
from typing import Any

from sqlalchemy import select, text as sa_text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.llm_service import llm_service
from app.services.embedding_service import embedding_service
from app.services.recommendation_service import build_interest_context
from app.core.vector_store import get_or_create_collection
from app.models.knowledge import KnowledgeChunk, QAPair
from app.models.avatar import AvatarConfig


def _strip_markdown(text: str) -> str:
    """Post-process LLM response to remove all markdown formatting."""
    # Remove bold markers **text** -> text
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    # Remove italic markers *text* -> text
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove bullet list markers at line start
    text = re.sub(r'^\s*[-*]\s+', '', text, flags=re.MULTILINE)
    # Remove numbered list markers (keep the number text)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Remove heading markers
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove code block markers
    text = re.sub(r'```\w*\n?', '', text)
    # Remove horizontal rules
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    # Collapse excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _extract_keywords(question: str, min_len: int = 1) -> list[str]:
    """Extract meaningful Chinese keywords from a question."""
    # Remove punctuation and question markers
    cleaned = re.sub(r'[？?。，,！!、\s]+', ' ', question)
    # Remove filler/question words but keep domain-significant words
    cleaned = re.sub(r'(请问|请|帮我|给我|介绍一下|是什么|怎么样|如何|有没有|哪里|在哪|怎么)', ' ', cleaned)

    words = []
    # Try jieba for Chinese word segmentation
    try:
        import jieba
        words = [w.strip() for w in jieba.cut(cleaned) if len(w.strip()) >= min_len]
        # Remove duplicates while preserving order
        seen = set()
        result = []
        for w in words:
            if w not in seen:
                seen.add(w)
                result.append(w)
        return result[:10]
    except ImportError:
        pass

    # Fallback: sliding window n-grams (3 down to 1 char)
    chars = cleaned.strip()
    result = []
    seen = set()
    for n in [3, 2, 1]:
        for i in range(len(chars) - n + 1):
            gram = chars[i:i + n]
            if gram not in seen and len(gram.strip()) >= min_len:
                seen.add(gram)
                result.append(gram)
    return result[:15]


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
        parts.append("## 景区数据库信息\n" + scenic_data)

    if interest_context:
        parts.append("## 游客偏好\n" + interest_context)

    parts.append(
        "【重要指示】请严格遵循以下要求回答用户问题：\n"
        "1. 使用自然、流畅的中文口语表达，如同一位亲切的导游在面对面讲解。\n"
        "2. 绝对禁止使用任何 Markdown 格式标记！不要用 ** 加粗文字，不要用 - 或 * 开头做列表，不要用 # 做标题，不要用 ``` 做代码块。\n"
        "3. 如需列举信息，请用中文序号（一、二、三）或阿拉伯数字（1. 2. 3.），每条信息用句号或分号结尾，自然融入段落中。\n"
        "4. 必须优先基于景区数据库中提供的数据回答，引用真实的价格、时间、地点等信息。\n"
        "5. 如果数据库中没有相关信息，请如实告知，并用自己的知识补充。\n"
        "6. 回答应详细、准确，包含具体数字（如价格、时间、地点等）。"
    )

    return "\n\n".join(parts)


async def _search_chromadb(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """Search ChromaDB for similar chunks."""
    collection = get_or_create_collection("scenic_knowledge")
    if collection.count() == 0:
        return []

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
    """Search Q&A pairs for keyword matches."""
    keywords = _extract_keywords(question)
    if not keywords:
        return []

    conditions = []
    for kw in keywords[:5]:
        conditions.append(QAPair.question.contains(kw))
        conditions.append(QAPair.question_key.contains(kw))

    if not conditions:
        return []

    result = await db.execute(
        select(QAPair)
        .where(or_(*conditions))
        .where(QAPair.is_active == True)
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


async def _query_scenic_data(db: AsyncSession, question: str) -> str:
    """Query MySQL scenic tables with keyword-aware searches."""
    keywords = _extract_keywords(question)
    keyword_str = " ".join(keywords) if keywords else question

    data_parts = []

    # Define all scenic tables and their searchable columns
    table_configs = [
        {
            "table": "scenic_spots",
            "label": "景点信息",
            "columns": ["spot_name", "detailed_intro", "highlights", "cultural_connotation", "core_function", "location", "open_info"],
            "display_cols": "spot_name, location, detailed_intro, highlights, open_info, cultural_connotation",
        },
        {
            "table": "ticket_policies",
            "label": "票务信息",
            "columns": ["ticket_type", "target_audience"],
            "display_cols": "ticket_type, price, target_audience",
        },
        {
            "table": "tour_routes",
            "label": "游览路线",
            "columns": ["route_type", "key_points", "experiences", "path"],
            "display_cols": "route_type, duration, path, key_points, experiences",
        },
        {
            "table": "scenic_overview",
            "label": "景区概览",
            "columns": ["location", "history", "culture"],
            "display_cols": "location, area, level, history, culture",
        },
        {
            "table": "cultural_shturl",
            "label": "文化资料",
            "columns": ["culture_type", "content"],
            "display_cols": "culture_type, content",
        },
        {
            "table": "history_shturl",
            "label": "历史资料",
            "columns": ["period", "event", "detail"],
            "display_cols": "period, event, detail",
        },
        {
            "table": "performance_shturl",
            "label": "演出信息",
            "columns": ["show_name", "location", "note"],
            "display_cols": "show_name, location, show_time, duration, note",
        },
        {
            "table": "travel_shturl",
            "label": "旅游贴士",
            "columns": ["tip_category", "content"],
            "display_cols": "tip_category, content",
        },
    ]

    for config in table_configs:
        try:
            # Expand keywords: also include individual chars from short keywords
            expanded_kws = list(keywords)
            for kw in keywords[:8]:
                if len(kw) >= 2:
                    for ch in kw:
                        if ch.strip() and ch not in expanded_kws:
                            expanded_kws.append(ch)

            search_kws = expanded_kws[:15]

            # Build LIKE conditions for each keyword and each column
            like_conditions = []
            for col in config["columns"]:
                for kw in search_kws:
                    like_conditions.append(f"{col} LIKE :kw_{len(like_conditions)}")

            if not like_conditions:
                continue

            where_clause = " OR ".join(like_conditions)

            query = sa_text(
                f"SELECT {config['display_cols']} FROM {config['table']} "
                f"WHERE {where_clause} LIMIT 8"
            )

            param_list = {}
            idx = 0
            for col in config["columns"]:
                for kw in search_kws:
                    param_list[f"kw_{idx}"] = f"%{kw}%"
                    idx += 1

            result = await db.execute(query, param_list)
            rows = result.fetchall()

            if rows:
                # Format as readable text
                items = []
                for row in rows:
                    item_dict = dict(row._mapping)
                    # Remove None values for cleaner output
                    item_dict = {k: v for k, v in item_dict.items() if v is not None}
                    items.append(json.dumps(item_dict, ensure_ascii=False, default=str))

                data_parts.append(f"【{config['label']}】\n" + "\n".join(items))

        except Exception as e:
            # Log silently and continue to next table
            pass

    return "\n\n".join(data_parts)


async def retrieve_context(
    question: str,
    db: AsyncSession,
    top_k: int = 10,
) -> tuple[list[dict], list[dict], str]:
    """Retrieve relevant context from all sources."""
    query_embedding = embedding_service.embed_query(question)

    # Search ChromaDB
    chroma_chunks = await _search_chromadb(query_embedding, top_k=top_k)

    # Search Q&A pairs
    qa_matches = await _search_qa_keywords(question, db)

    # Query scenic data from MySQL with keyword matching
    scenic_data = await _query_scenic_data(db, question)

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
        "你是一个热情、知识渊博的景区导览助手。请用口语化的中文友好地回答游客的问题，如同一位亲切的导游在面对面讲解。"
    )

    # 3. Build context chunks from ChromaDB results
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

    if conversation_history:
        messages.extend(conversation_history[-6:])

    messages.append({"role": "user", "content": question})

    # 8. Generate response
    raw_text = await llm_service.generate(
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )

    # 9. Strip markdown from response
    response_text = _strip_markdown(raw_text)

    # 10. Build sources
    sources = [
        {"chunk_id": c["chunk_id"], "document_title": c["document_title"], "score": c["score"]}
        for c in top_chunks
    ]

    return {
        "content": response_text,
        "sources": sources,
    }
