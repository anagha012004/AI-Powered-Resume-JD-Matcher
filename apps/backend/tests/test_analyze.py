"""
Full test suite for AI-Powered Resume & JD Matcher.
All LLM and Redis calls are mocked — no API keys or running services required.
Run: uv run pytest -v
"""

import pytest
from unittest.mock import AsyncMock, patch

from tests.conftest import (
    SAMPLE_RESUME, SAMPLE_JD,
    MOCK_SCORE, MOCK_TAILOR, MOCK_COVER, MOCK_OUTREACH, MOCK_SUGGEST,
    MOCK_PARSE_RESULT,
)

_ANALYZE_MOCKS = dict(
    cosine_similarity="app.routes.analyze.cosine_similarity",
    score_with_gemini="app.routes.analyze.score_with_gemini",
    parse_resume="app.routes.analyze.parse_resume",
    save_history="app.routes.analyze._save_history",
)


# ══════════════════════════════════════════════════════════════════════════════
# Health
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ══════════════════════════════════════════════════════════════════════════════
# Auth
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_register_and_login(client):
    import time
    email = f"user_{int(time.time()*1000)}@example.com"

    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Alice", "email": email, "password": "pass12345"})
    assert reg.status_code == 201
    assert "access_token" in reg.json()

    dup = await client.post("/api/v1/auth/register",
                            json={"name": "Alice", "email": email, "password": "pass12345"})
    assert dup.status_code == 400

    login = await client.post("/api/v1/auth/login",
                              json={"email": email, "password": "pass12345"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/v1/auth/login",
                             json={"email": "nobody@example.com", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403, 422)


# ══════════════════════════════════════════════════════════════════════════════
# Analyze
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_analyze_high_similarity(auth_client):
    client, _ = auth_client
    with patch(_ANALYZE_MOCKS["cosine_similarity"], return_value=0.75), \
         patch(_ANALYZE_MOCKS["score_with_gemini"], return_value=MOCK_SCORE), \
         patch(_ANALYZE_MOCKS["parse_resume"], return_value=MOCK_PARSE_RESULT), \
         patch(_ANALYZE_MOCKS["save_history"], new_callable=AsyncMock):
        resp = await client.post("/api/v1/analyze",
                                 json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD})
    assert resp.status_code == 200
    data = resp.json()
    assert data["match_score"] == 85
    assert data["cache_hit"] is False
    assert "Python" in data["matched_keywords"]
    assert data["score_breakdown"]["completeness"] == 70
    assert 0 <= data["score_breakdown"]["semantic_similarity"] <= 1


@pytest.mark.asyncio
async def test_analyze_low_similarity(auth_client):
    client, _ = auth_client
    with patch(_ANALYZE_MOCKS["cosine_similarity"], return_value=0.10), \
         patch(_ANALYZE_MOCKS["parse_resume"], return_value=MOCK_PARSE_RESULT), \
         patch(_ANALYZE_MOCKS["save_history"], new_callable=AsyncMock):
        resp = await client.post("/api/v1/analyze",
                                 json={"resume_text": "totally unrelated text", "jd_text": SAMPLE_JD})
    assert resp.status_code == 200
    data = resp.json()
    assert data["match_score"] < 25
    assert "low" in data["justification"].lower()


@pytest.mark.asyncio
async def test_analyze_cache_hit(auth_client):
    client, _ = auth_client
    with patch("app.routes.analyze.get_cached", new_callable=AsyncMock, return_value=MOCK_SCORE), \
         patch(_ANALYZE_MOCKS["cosine_similarity"], return_value=0.8), \
         patch(_ANALYZE_MOCKS["parse_resume"], return_value=MOCK_PARSE_RESULT):
        resp = await client.post("/api/v1/analyze",
                                 json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD})
    assert resp.status_code == 200
    assert resp.json()["cache_hit"] is True


@pytest.mark.asyncio
async def test_analyze_requires_auth(client):
    resp = await client.post("/api/v1/analyze",
                             json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD})
    assert resp.status_code in (401, 403, 422)


# ══════════════════════════════════════════════════════════════════════════════
# Resume Parse & Keyword Extract
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_resume_parse(auth_client):
    client, _ = auth_client
    resp = await client.post("/api/v1/resume/parse",
                             json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD})
    assert resp.status_code == 200
    data = resp.json()
    assert 0 <= data["completeness_score"] <= 100
    assert isinstance(data["sections"], dict)
    assert isinstance(data["missing_sections"], list)
    assert data["contact"]["email"] == "jane@example.com"


@pytest.mark.asyncio
async def test_resume_parse_tfidf_keywords(auth_client):
    client, _ = auth_client
    resp = await client.post("/api/v1/resume/parse",
                             json={"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD})
    kws = resp.json()["tfidf_keywords"]
    assert len(kws) > 0
    for kw in kws:
        assert "keyword" in kw and "score" in kw and "in_resume" in kw


@pytest.mark.asyncio
async def test_keyword_extract(auth_client):
    client, _ = auth_client
    resp = await client.post("/api/v1/keywords/extract",
                             json={"text": SAMPLE_JD, "top_n": 10})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["keywords"]) <= 10
    assert all("keyword" in k and "score" in k for k in data["keywords"])


# ══════════════════════════════════════════════════════════════════════════════
# Suggest
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_suggest(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_SUGGEST
    resp = await client.post("/api/v1/suggest", json={
        "resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD,
        "missing_keywords": ["Kubernetes", "Terraform"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suggested_edits"]) > 0
    assert "keywords_to_add" in data
    edit = data["suggested_edits"][0]
    assert "section" in edit and "suggested" in edit and "reason" in edit


# ══════════════════════════════════════════════════════════════════════════════
# Tailor
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_tailor_keywords_depth(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_TAILOR
    resp = await client.post("/api/v1/tailor", json={
        "master_resume": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "depth": "keywords",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["tailored_resume"]
    assert isinstance(data["changes_summary"], list)
    assert "match_percentage" in data["jd_match"]
    assert isinstance(data["jd_match"]["highlighted_keywords"], list)


@pytest.mark.asyncio
async def test_tailor_all_depths(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_TAILOR
    for depth in ("light", "keywords", "full"):
        resp = await client.post("/api/v1/tailor", json={
            "master_resume": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "depth": depth,
        })
        assert resp.status_code == 200, f"depth={depth} failed: {resp.text}"


@pytest.mark.asyncio
async def test_tailor_invalid_depth(auth_client):
    client, _ = auth_client
    resp = await client.post("/api/v1/tailor", json={
        "master_resume": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "depth": "invalid",
    })
    assert resp.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# Cover Letter
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cover_letter(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_COVER
    resp = await client.post("/api/v1/cover-letter", json={
        "resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "tone": "professional",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["cover_letter"]
    assert data["subject_line"]


@pytest.mark.asyncio
async def test_cover_letter_all_tones(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_COVER
    for tone in ("professional", "enthusiastic", "concise"):
        resp = await client.post("/api/v1/cover-letter", json={
            "resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "tone": tone,
        })
        assert resp.status_code == 200, f"tone={tone} failed"


# ══════════════════════════════════════════════════════════════════════════════
# Outreach
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_outreach_linkedin(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = MOCK_OUTREACH
    resp = await client.post("/api/v1/outreach", json={
        "resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "platform": "linkedin",
    })
    assert resp.status_code == 200
    assert resp.json()["message"]


@pytest.mark.asyncio
async def test_outreach_all_platforms(auth_client, mock_llm):
    client, _ = auth_client
    mock_llm.return_value = {**MOCK_OUTREACH, "subject": "Re: Python role"}
    for platform in ("linkedin", "email", "cold_email"):
        resp = await client.post("/api/v1/outreach", json={
            "resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "platform": platform,
        })
        assert resp.status_code == 200, f"platform={platform} failed"


# ══════════════════════════════════════════════════════════════════════════════
# Batch Rank
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_batch_rank(auth_client):
    client, _ = auth_client
    with patch("app.routes.batch.cosine_similarity", return_value=0.8), \
         patch("app.routes.batch.score_with_gemini",
               return_value={"match_score": 80, "justification": "Good match."}):
        resp = await client.post("/api/v1/batch-rank", json={
            "jd_text": SAMPLE_JD,
            "resumes": [
                {"filename": "alice.txt", "text": SAMPLE_RESUME},
                {"filename": "bob.txt",   "text": "Bob — junior dev, HTML/CSS only"},
            ],
        })
    assert resp.status_code == 200
    rankings = resp.json()["rankings"]
    assert len(rankings) == 2
    scores = [r["match_score"] for r in rankings]
    assert scores == sorted(scores, reverse=True)
    assert rankings[0]["rank"] == 1


# ══════════════════════════════════════════════════════════════════════════════
# History
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_history_returns_list(auth_client):
    client, _ = auth_client
    resp = await client.get("/api/v1/history")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_history_limit_param(auth_client):
    client, _ = auth_client
    resp = await client.get("/api/v1/history?limit=5")
    assert resp.status_code == 200
    assert len(resp.json()) <= 5


@pytest.mark.asyncio
async def test_history_invalid_limit(auth_client):
    client, _ = auth_client
    resp = await client.get("/api/v1/history?limit=0")
    assert resp.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# PDF Export
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_pdf_export_all_templates(auth_client):
    client, _ = auth_client
    base_payload = {
        "formatting": {
            "page_size": "A4", "margin_top": 40, "margin_bottom": 40,
            "margin_left": 50, "margin_right": 50, "section_spacing": 14,
            "item_spacing": 5, "line_height": 14, "compact_mode": False,
            "contact_icons": True, "accent_color": "#6366f1",
            "fonts": {"header_family": "Helvetica", "body_family": "Helvetica",
                      "base_size": 10, "header_scale": 1.4},
        },
        "resume": {
            "name": "Jane Smith", "email": "jane@example.com",
            "phone": "+1-555-0100", "linkedin": "linkedin.com/in/jane",
            "github": "github.com/jane", "location": "SF, CA",
            "sections": [
                {"type": "summary",    "title": "Summary",    "order": 0, "content": "Senior engineer."},
                {"type": "experience", "title": "Experience", "order": 1,
                 "content": "Engineer | Acme | 2020-Present\n- Built FastAPI APIs on AWS"},
                {"type": "skills",     "title": "Skills",     "order": 2,
                 "content": "- Python\n- FastAPI\n- Docker"},
                {"type": "education",  "title": "Education",  "order": 3,
                 "content": "B.Sc. CS | MIT | 2016"},
            ],
        },
    }
    for template in ("swiss_single", "swiss_two", "modern", "modern_two"):
        payload = {**base_payload, "template": template}
        resp = await client.post("/api/v1/export/pdf", json=payload)
        assert resp.status_code == 200, f"template={template}: {resp.text}"
        assert "pdf" in resp.headers["content-type"]
        assert resp.content[:4] == b"%PDF"
