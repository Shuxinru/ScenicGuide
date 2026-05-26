from openai import AsyncOpenAI

from app.config import settings


class LLMService:
    """OpenAI-compatible LLM wrapper for DeepSeek API."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key="sk-03204015e1e64aa59770b75f43ff4557",
            base_url="https://api.deepseek.com"
        )
        self.model = settings.llm_model
        self.embedding_model = settings.llm_embedding_model

    async def generate(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """Generate a chat completion response."""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def generate_embedding(self, text: str | list[str]) -> list[list[float]]:
        """Generate embeddings for one or more texts."""
        if isinstance(text, str):
            text = [text]
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=text,
        )
        return [r.embedding for r in response.data]


# Singleton instance
llm_service = LLMService()
