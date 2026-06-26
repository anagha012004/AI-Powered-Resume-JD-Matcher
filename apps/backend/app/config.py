from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    redis_url: str = "redis://localhost:6379"
    database_url: str = "sqlite+aiosqlite:///./resume_matcher.db"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    low_similarity_threshold: float = 0.25
    cache_ttl: int = 86400  # 24 hours

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
