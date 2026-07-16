import asyncio
import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

from sqlalchemy import select, text as sa_text, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.llm_service import llm_service
from app.services.embedding_service import embedding_service
from app.services.recommendation_service import build_interest_context, get_recommended_routes
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


TONE_INSTRUCTIONS: dict[str, str] = {
    "friendly": (
        "【语气要求：亲切友好】\n"
        "- 像一位关心游客的朋友或家人，语气温暖、有亲和力\n"
        "- 在回答中适当加入人文关怀，如提醒注意天气、休息、安全等\n"
        "- 多使用「您」「请」「祝您」「欢迎」等礼貌热情的词语\n"
        "- 回答结尾可以加上一句温馨祝福或贴心小提示\n"
        "- 对游客的疑问给予充分的理解和耐心"
    ),
    "professional": (
        "【语气要求：专业严谨】\n"
        "- 语言简洁凝练，用词准确规范，如同一位专业导游\n"
        "- 优先引用具体数据（时间、价格、距离、编号等），用事实说话\n"
        "- 条理清晰：背景 → 要点 → 实用信息，层层递进\n"
        "- 避免冗余表达，每句话都应有信息量\n"
        "- 适当使用专业术语，但要确保游客能理解"
    ),
    "humorous": (
        "【语气要求：幽默风趣】\n"
        "- 语言生动活泼，偶尔加入俏皮话或幽默的比喻\n"
        "- 在合适的时机（如介绍趣味景点时）加入轻松的调侃\n"
        "- 可以用夸张、拟人等修辞手法让讲解更有趣\n"
        "- 保持信息的准确性，幽默是点缀而非主体\n"
        "- 注意分寸：不拿严肃的历史文化开玩笑，不冒犯游客"
    ),
}

STYLE_INSTRUCTIONS: dict[str, str] = {
    "古风": (
        "【语言风格：古风】\n"
        "- 适当融入古典诗词意象和文言表达，如「此处」、「诸位」、「可谓」等\n"
        "- 描写景色时多用工笔手法，意境悠远\n"
        "- 引经据典时自然融入白话文中，不显生硬"
    ),
    "现代": (
        "【语言风格：现代】\n"
        "- 采用自然流畅的现代中文口语，亲切随意\n"
        "- 可用当下流行的表达方式，贴近年轻人的语言习惯"
    ),
    "卡通": (
        "【语言风格：卡通】\n"
        "- 语气萌趣可爱，偶尔使用拟声词（如「叮咚～」「哇塞～」）\n"
        "- 用小朋友也能理解的方式讲解复杂知识\n"
        "- 可以想象成可爱的卡通导游在带领游客游览"
    ),
}


def _build_system_prompt(
    persona_prompt: str,
    context_chunks: list[str],
    matched_qa: list[str],
    scenic_data: str,
    interest_context: str,
    route_recommendations: str = "",
    tone: str = "friendly",
    style: str = "现代",
) -> str:
    parts = [persona_prompt]

    # Inject tone-specific instructions (if available)
    tone_instr = TONE_INSTRUCTIONS.get(tone)
    if tone_instr:
        parts.append(tone_instr)

    # Inject style-specific instructions (if available)
    style_instr = STYLE_INSTRUCTIONS.get(style)
    if style_instr:
        parts.append(style_instr)

    if context_chunks:
        parts.append("## 参考资料\n" + "\n\n".join(context_chunks))

    if matched_qa:
        parts.append("## 相关问答\n" + "\n\n".join(matched_qa))

    if scenic_data:
        parts.append("## 景区数据库信息\n" + scenic_data)

    if interest_context:
        parts.append("## 游客偏好\n" + interest_context)

    if route_recommendations:
        parts.append("## 推荐游览路线\n" + route_recommendations)

    parts.append(
        "【数字人行为规范 — 最高优先级，必须严格遵守！】\n"
        "1. 【诚实第一】你绝对不能编造、虚构或捏造任何信息。每一个事实陈述都必须有依据。\n"
        "2. 【数据溯源】所有价格、时间、距离、历史年代等具体数字，只能从景区数据库或参考资料中引用，禁止凭空生成。\n"
        "3. 【知之为知之】如果数据库和参考资料中没有相关信息，你必须诚实地说「抱歉，我目前没有掌握这方面的信息，建议您咨询景区工作人员」，不得用猜测、估计或编造来填补空白。\n"
        "4. 【禁止幻觉】禁止编造不存在的景点名称、路线、票价、演出时间、历史事件。禁止将其他景区的信息套用到本景区。\n"
        "5. 【不确定时明确说明】如果信息不够完整或你不够确定，必须在回答中明确标注「根据现有资料」或「建议您现场确认」。\n"
        "6. 【精简回答】默认回答控制在 3-5 句话（约60-120字），言简意赅、直奔主题。只讲最核心的 1-2 个要点。仅在游客明确要求「详细说说」「再具体一点」「展开讲讲」或连续追问同一话题时，才提供完整详细的回答。\n"
        "7. 【口语表达】使用自然、流畅的中文口语，如同一位导游在面对面简短交流。\n"
        "8. 【格式要求】绝对禁止使用 Markdown 格式（**、#、-、``` 等），列举用中文序号或阿拉伯数字。"
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

    # --- Phase 0: Direct spot name match via n-grams ---
    # Extract potential spot names (2-5 char n-grams) from cleaned question
    cleaned_q = re.sub(r'[？?。，,！!、\s\[\]【】\'\"（）()]+', '', question)
    cleaned_q = re.sub(
        r'(请问|请|帮我|给我|介绍一下|是什么|怎么样|如何|有没有|哪里|在哪|怎么|的情况|包括|和|等|以及|还有|告诉我|讲一下|说说)',
        '', cleaned_q,
    )
    spot_candidates: list[str] = []
    # Iterate from shorter to longer: 2-4 char n-grams are more likely exact spot names
    for n in [2, 3, 4, 5]:
        for i in range(len(cleaned_q) - n + 1):
            cand = cleaned_q[i:i + n]
            if cand not in spot_candidates:
                spot_candidates.append(cand)
    # Use up to 30 candidates; shorter n-grams are prioritized for spot name matching

    if spot_candidates:
        try:
            spot_conds = " OR ".join(
                [f"spot_name LIKE :sc_{i}" for i in range(len(spot_candidates))]
            )
            spot_params = {
                f"sc_{i}": f"%{c}%" for i, c in enumerate(spot_candidates)
            }
            spot_query = sa_text(
                f"SELECT scenic_area_name, spot_name, location, detailed_intro, highlights, open_info, cultural_connotation "
                f"FROM scenic_spots WHERE {spot_conds} LIMIT 5"
            )
            spot_result = await db.execute(spot_query, spot_params)
            spot_rows = spot_result.fetchall()
            if spot_rows:
                items = []
                for row in spot_rows:
                    item_dict = dict(row._mapping)
                    item_dict = {k: v for k, v in item_dict.items() if v is not None}
                    items.append(json.dumps(item_dict, ensure_ascii=False, default=str))
                data_parts.append("【景点信息（精确匹配）】\n" + "\n".join(items))
        except Exception as e:
            logger.warning("Phase 0 spot match failed: %s", e)

    # Define all scenic tables and their searchable columns
    table_configs = [
        {
            "table": "scenic_spots",
            "label": "景点信息",
            "columns": ["scenic_area_name", "spot_name", "detailed_intro", "highlights", "cultural_connotation", "core_function", "location", "open_info"],
            "display_cols": "scenic_area_name, spot_name, location, detailed_intro, highlights, open_info, cultural_connotation",
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
                f"WHERE {where_clause} LIMIT 12"
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
            logger.warning("Scenic table query failed for %s: %s", config["table"], e)

    return "\n\n".join(data_parts)


ROUTE_KEYWORDS = re.compile(
    r'路线|推荐.*路|路.*推荐|游览.*线|线.*游览|怎么走|怎么逛|走.*路线|逛.*路线|'
    r'适合.*路线|路线.*适合|亲子|历史文化|自然风光|家庭|行程|攻略|怎么玩'
)

# route_id -> matcher keywords (any match in response text = this route)
ROUTE_SIGNALS: list[tuple[str, list[str]]] = [
    ("历史文化爱好者", ["历史文化爱好者", "历史文化路线", "历史文化"]),
    ("自然风光爱好者", ["自然风光爱好者", "自然风光路线", "自然风光"]),
    ("亲子家庭", ["亲子家庭", "亲子路线", "亲子", "家庭路线", "家庭出游"]),
]


def _detect_route_id(question: str, response_text: str, scenic_data: str) -> str | None:
    """Detect if the question is route-related and extract a matching route_id."""
    if not ROUTE_KEYWORDS.search(question):
        return None

    # Check scenic data (DB results in JSON) for exact route_type first
    combined = scenic_data + response_text
    for route_id, signals in ROUTE_SIGNALS:
        for sig in signals:
            if sig in combined:
                return route_id

    return None


async def retrieve_context(
    question: str,
    db: AsyncSession,
    top_k: int = 6,
) -> tuple[list[dict], list[dict], str]:
    """Retrieve relevant context from all sources in parallel."""
    query_embedding = embedding_service.embed_query(question)

    # Run ChromaDB, QA, and scenic queries in parallel
    chroma_chunks, qa_matches, scenic_data = await asyncio.gather(
        _search_chromadb(query_embedding, top_k=top_k),
        _search_qa_keywords(question, db),
        _query_scenic_data(db, question),
    )

    return chroma_chunks, qa_matches, scenic_data


async def generate_rag_response(
    question: str,
    conversation_history: list[dict],
    user_interests: list[str],
    db: AsyncSession,
) -> dict:
    """Full RAG pipeline: retrieve context and generate response."""

    # 1. Retrieve context
    chroma_chunks, qa_matches, scenic_data = await retrieve_context(question, db, top_k=6)

    # 2. Get avatar config (persona, tone, style)
    result = await db.execute(select(AvatarConfig).limit(1))
    avatar_config = result.scalars().first()
    persona_prompt = avatar_config.persona_prompt if avatar_config else (
        "你是一个热情、知识渊博的景区导览助手。请用口语化的中文友好地回答游客的问题，如同一位亲切的导游在面对面讲解。"
    )
    tone = avatar_config.tone if avatar_config else "friendly"
    style = avatar_config.style if avatar_config else "现代"

    # 3. Build context chunks from ChromaDB results
    top_chunks = chroma_chunks[:5]
    context_texts = []
    for c in top_chunks:
        context_texts.append(f"【{c['document_title']}】\n{c['content']}")

    # 4. Build matched Q&A text
    qa_texts = []
    for qa in qa_matches[:5]:
        qa_texts.append(f"问: {qa['question']}\n答: {qa['answer']}")

    # 5. Build interest context and get route recommendations
    interest_context = build_interest_context(user_interests) if user_interests else ""

    route_recommendations = ""
    if user_interests:
        try:
            routes = await get_recommended_routes(user_interests, db)
            if routes:
                route_lines = []
                for r in routes:
                    route_parts = []
                    if r.get("route_type"):
                        route_parts.append(f"路线类型: {r['route_type']}")
                    if r.get("duration"):
                        route_parts.append(f"时长: {r['duration']}")
                    if r.get("path"):
                        route_parts.append(f"路径: {r['path']}")
                    if r.get("key_points"):
                        route_parts.append(f"要点: {r['key_points']}")
                    if r.get("experiences"):
                        route_parts.append(f"体验: {r['experiences']}")
                    route_lines.append(" | ".join(route_parts))
                route_recommendations = "\n".join(route_lines)
        except Exception:
            pass

    # 6. Build system prompt
    system_prompt = _build_system_prompt(
        persona_prompt=persona_prompt,
        context_chunks=context_texts,
        matched_qa=qa_texts,
        scenic_data=scenic_data,
        interest_context=interest_context,
        route_recommendations=route_recommendations,
        tone=tone,
        style=style,
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
        max_tokens=768,
    )

    # 9. Strip markdown from response
    response_text = _strip_markdown(raw_text)

    # 10. Build sources
    sources = [
        {"chunk_id": c["chunk_id"], "document_title": c["document_title"], "score": c["score"]}
        for c in top_chunks
    ]

    # 11. Detect suggested route for map display
    suggested_route_id = _detect_route_id(question, response_text, scenic_data)

    result: dict = {
        "content": response_text,
        "sources": sources,
    }
    if suggested_route_id:
        result["suggested_route_id"] = suggested_route_id

    return result
