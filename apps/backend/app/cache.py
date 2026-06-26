import json
import hashlib
import redis.asyncio as aioredis
from typing import Optional
from app.config import settings

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


async def get_cached(key: str) -> Optional[dict]:
    try:
        r = await get_redis()
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def set_cached(key: str, value: dict) -> None:
    try:
        r = await get_redis()
        await r.setex(key, settings.cache_ttl, json.dumps(value))
    except Exception:
        pass


def score_cache_key(resume_text: str, jd_text: str) -> str:
    return f"score:{sha256(resume_text)}:{sha256(jd_text)}"


def embedding_cache_key(text: str) -> str:
    return f"emb:{sha256(text)}"
