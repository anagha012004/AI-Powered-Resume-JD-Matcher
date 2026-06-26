import os
import pytest

# Set dummy env vars before any app import so pydantic-settings doesn't fail
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_resume_matcher.db")
