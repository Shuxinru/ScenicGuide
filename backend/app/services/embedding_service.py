from app.services.llm_service import llm_service


class EmbeddingService:
    """Wraps the LLM embedding API for text and query embedding."""

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        return await llm_service.generate_embedding(texts)

    async def embed_query(self, text: str) -> list[float]:
        """Generate an embedding for a single query string."""
        results = await llm_service.generate_embedding(text)
        return results[0]


embedding_service = EmbeddingService()
