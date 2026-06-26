import json
import numpy as np
from sentence_transformers import SentenceTransformer
from app.cache import get_cached, set_cached, embedding_cache_key

_model: SentenceTransformer | None = None
MODEL_NAME = "all-MiniLM-L6-v2"


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


async def get_embedding(text: str) -> list[float]:
    key = embedding_cache_key(text)
    cached = await get_cached(key)
    if cached:
        return cached["embedding"]
    embedding = get_model().encode(text, normalize_embeddings=True).tolist()
    await set_cached(key, {"embedding": embedding})
    return embedding


async def cosine_similarity(text_a: str, text_b: str) -> float:
    emb_a = np.array(await get_embedding(text_a))
    emb_b = np.array(await get_embedding(text_b))
    # Embeddings are already L2-normalized, dot product = cosine similarity
    return float(np.dot(emb_a, emb_b))
