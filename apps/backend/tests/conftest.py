import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

# ── Env must be set before any app import ────────────────────────────────────
os.environ.setdefault("GEMINI_API_KEY",  "test-gemini-key")
os.environ.setdefault("GROQ_API_KEY",    "test-groq-key")
os.environ.setdefault("SECRET_KEY",      "test-secret-key-32-chars-minimum!")
os.environ.setdefault("REDIS_URL",       "redis://localhost:6379")
os.environ.setdefault("DATABASE_URL",    "sqlite+aiosqlite:///./test_resume_matcher.db")

from httpx import AsyncClient, ASGITransport          # noqa: E402
from app.main import app                               # noqa: E402
from app.models.database import Base, engine          # noqa: E402

# ── Shared test payloads ──────────────────────────────────────────────────────

SAMPLE_RESUME = (
    "Jane Smith | jane@example.com | +1-555-0100 | linkedin.com/in/janesmith\n\n"
    "Summary:\nSenior Python engineer with 7 years building scalable backend services.\n\n"
    "Experience:\nStaff Engineer | Acme Corp | 2020 – Present\n"
    "- Built FastAPI microservices deployed on AWS ECS with Docker\n"
    "- Optimised PostgreSQL queries, reducing P99 latency by 45%\n\n"
    "Skills:\nPython, FastAPI, PostgreSQL, Redis, Docker, AWS, SQLAlchemy\n\n"
    "Education:\nB.Sc. Computer Science | MIT | 2016"
)

SAMPLE_JD = (
    "We are looking for a Senior Python Engineer.\n"
    "Required: FastAPI, PostgreSQL, Docker, AWS.\n"
    "Nice to have: Kubernetes, Terraform, Redis."
)

MOCK_SCORE = {
    "match_score": 85,
    "justification": "Strong Python and AWS experience.",
    "role_level_match": "Strong",
    "strengths": ["Python", "FastAPI"],
    "gaps": ["Kubernetes"],
    "matched_keywords": ["Python", "FastAPI", "AWS", "Docker", "PostgreSQL"],
    "missing_keywords": ["Kubernetes", "Terraform"],
    "section_scores": {"skills": 90, "experience": 80, "education": 70},
    "ats_flags": [],
}

MOCK_TAILOR = {
    "tailored_resume": "Jane Smith — tailored resume text with Kubernetes mention",
    "changes_summary": ["Added Kubernetes to skills", "Rewrote summary"],
    "covered_requirements": ["FastAPI", "Docker"],
    "missing_requirements": ["Kubernetes"],
}

MOCK_COVER = {
    "subject_line": "Application for Senior Python Engineer",
    "cover_letter": "Dear Hiring Manager,\n\nI am excited to apply...",
}

MOCK_OUTREACH = {
    "subject": None,
    "message": "Hi! I noticed your opening for a Python Engineer and would love to connect.",
}

MOCK_SUGGEST = {
    "suggested_edits": [
        {
            "section": "Experience",
            "original": "Built APIs",
            "suggested": "Built Kubernetes-deployed APIs on AWS ECS",
            "reason": "Adds missing keyword Kubernetes naturally.",
        }
    ],
    "keywords_to_add": ["Kubernetes"],
    "summary_rewrite": "Staff Python engineer with Kubernetes and AWS expertise.",
}

MOCK_PARSE_RESULT = {
    "sections": {}, "contact": {"email": None, "phone": None, "linkedin": None, "github": None},
    "completeness_score": 70, "missing_sections": [], "tfidf_keywords": [],
}


# ── Session-scoped DB setup / teardown ───────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables once per test session, drop them at the end."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Global Redis mock (autouse) ───────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_redis():
    with patch("app.cache.get_cached", return_value=None), \
         patch("app.cache.set_cached", new_callable=AsyncMock):
        yield


# ── Reusable fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def mock_llm():
    """Patch llm_call at every call site so all LLM-dependent routes are mocked."""
    targets = [
        "app.services.scorer.llm_call",
        "app.services.suggester.llm_call",
        "app.services.tailor.llm_call",
    ]
    with patch(targets[0], new_callable=AsyncMock) as m0, \
         patch(targets[1], new_callable=AsyncMock) as m1, \
         patch(targets[2], new_callable=AsyncMock) as m2:
        # Return value is set per-test via mock_llm.return_value
        # We expose m0 as the primary handle; tests set return_value on it
        # and we sync the others automatically.
        class _Multi:
            def __init__(self, mocks):
                self._mocks = mocks
            @property
            def return_value(self):
                return self._mocks[0].return_value
            @return_value.setter
            def return_value(self, v):
                for m in self._mocks:
                    m.return_value = v
        multi = _Multi([m0, m1, m2])
        yield multi


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_client(client):
    """Register a unique test user, log in, return (client_with_auth_header, token)."""
    import time
    email = f"testuser_{int(time.time()*1000)}@example.com"

    reg = await client.post("/api/v1/auth/register", json={
        "name": "Test User", "email": email, "password": "password123",
    })
    assert reg.status_code == 201, f"Register failed: {reg.text}"
    token = reg.json()["access_token"]

    client.headers.update({"Authorization": f"Bearer {token}"})
    yield client, token
