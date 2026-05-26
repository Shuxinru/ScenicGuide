from openai import AsyncOpenAI

from app.config import settings


class LLMService:
    """OpenAI-compatible LLM wrapper for DeepSeek API."""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_base,
        )
        self.model = settings.llm_model

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


llm_service = LLMService()
