import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app

SAMPLE_RESUME = """
John Doe | john@example.com
Senior Software Engineer with 5 years experience in Python, FastAPI, PostgreSQL.
Built microservices on AWS (ECS, Lambda). Strong in Docker, Kubernetes, CI/CD pipelines.
"""

SAMPLE_JD = """
We are looking for a Backend Engineer with Python and FastAPI experience.
Must have: AWS, Docker, PostgreSQL. Nice to have: Kubernetes, Redis.
"""

MOCK_GEMINI_RESPONSE = {
    "match_score": 85,
    "justification": "Strong Python and AWS experience aligns well with requirements.",
    "matched_keywords": ["Python", "FastAPI", "AWS", "Docker", "PostgreSQL"],
    "missing_keywords": ["Redis"],
    "section_scores": {"skills": 90, "experience": 80, "education": 70},
    "ats_flags": [],
}


@pytest.fixture
def mock_cache_miss():
    with patch("app.routes.analyze.get_cached", return_value=None), \
         patch("app.routes.analyze.set_cached", new_callable=AsyncMock), \
         patch("app.routes.analyze._save_history", new_callable=AsyncMock):
        yield


@pytest.mark.asyncio
async def test_analyze_high_similarity(mock_cache_miss):
    with patch("app.routes.analyze.cosine_similarity", return_value=0.75), \
         patch("app.routes.analyze.score_with_gemini", return_value=MOCK_GEMINI_RESPONSE):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/analyze",
                json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["match_score"] == 85
    assert "Python" in data["matched_keywords"]
    assert data["cache_hit"] is False


@pytest.mark.asyncio
async def test_analyze_low_similarity(mock_cache_miss):
    with patch("app.routes.analyze.cosine_similarity", return_value=0.10):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/analyze",
                json={"resume_text": "unrelated text", "jd_text": SAMPLE_JD},
            )
    assert resp.status_code == 200
    data = resp.json()
    assert data["match_score"] < 25
    assert "low" in data["justification"].lower()


@pytest.mark.asyncio
async def test_analyze_cache_hit():
    with patch("app.routes.analyze.get_cached", return_value=MOCK_GEMINI_RESPONSE):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/analyze",
                json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD},
            )
    assert resp.status_code == 200
    assert resp.json()["cache_hit"] is True


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
