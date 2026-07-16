from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MySQL Database — use DATABASE_URL directly, or set individual fields
    database_url: str = ""
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "tour_guide"

    @property
    def async_database_url(self) -> str:
        if self.database_url:
            # Replace pymysql with aiomysql for async
            url = self.database_url
            if url.startswith("mysql+pymysql://"):
                url = url.replace("mysql+pymysql://", "mysql+aiomysql://", 1)
            elif url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+aiomysql://", 1)
            # Ensure charset for Chinese support
            if "charset" not in url:
                sep = "&" if "?" in url else "?"
                url += f"{sep}charset=utf8mb4"
            return url
        url = f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        return url

    @property
    def sync_database_url(self) -> str:
        if self.database_url:
            url = self.database_url
            if "charset" not in url:
                sep = "&" if "?" in url else "?"
                url += f"{sep}charset=utf8mb4"
            return url
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"

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
        extra = "ignore"


settings = Settings()
