from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Local embedding service using Sentence Transformers."""

    def __init__(self):
        import os
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        self.model = SentenceTransformer(
            "paraphrase-multilingual-MiniLM-L12-v2",
            local_files_only=False,
        )

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        embedding = self.model.encode([text], normalize_embeddings=True)
        return embedding[0].tolist()


embedding_service = EmbeddingService()
