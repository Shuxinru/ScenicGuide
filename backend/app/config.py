from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MySQL Database
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "scenic_guide"

    @property
    def database_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def database_url_sync(self) -> str:
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    # DeepSeek API (OpenAI-compatible)
    llm_api_base: str = "https://api.deepseek.com/v1"
    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"
    llm_embedding_model: str = "text-embedding-3-small"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_data"

    # App
    scenic_area_name: str = "景区"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    admin_jwt_secret: str = "change-me-in-production"
    admin_jwt_algorithm: str = "HS256"
    admin_jwt_expire_minutes: int = 1440

    class Config:
        env_file = ".env"


settings = Settings()
