"""OpenAPI metadata injected into FastAPI at startup."""

DESCRIPTION = """
## AI-Powered Resume & JD Matcher

Two-stage pipeline: **local embeddings** (MiniLM) for fast pre-filtering, then
**cascading LLM** (Gemini 2.0 Flash → Groq → OpenRouter) for deep semantic scoring.

### Authentication
All endpoints except `/auth/register`, `/auth/login`, and `/health` require a
**Bearer JWT** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain a token from `POST /api/v1/auth/register` or `POST /api/v1/auth/login`.

### Base URL
```
http://localhost:8000/api/v1
```
"""

TAGS_METADATA = [
    {
        "name": "auth",
        "description": "Register, login, and inspect the current user. Returns JWT tokens.",
    },
    {
        "name": "analyze",
        "description": (
            "Score a resume against a job description. "
            "Accepts raw text (`/analyze`) or a PDF/TXT file upload (`/analyze/upload`). "
            "Results are cached in Redis for 24 h. "
            "Response includes `score_breakdown` with semantic similarity, keyword coverage, "
            "and resume completeness."
        ),
    },
    {
        "name": "builder",
        "description": (
            "Full tailoring workflow: tailor a master resume to a JD at three depths, "
            "generate cover letters and outreach messages, and export a structured resume to PDF "
            "using one of four templates with full formatting controls."
        ),
    },
    {
        "name": "resume",
        "description": (
            "Parse a resume into structured sections (contact, summary, skills, experience, "
            "education, projects, certifications, …). Returns a completeness score 0–100, "
            "missing sections list, and TF-IDF ranked keywords with `in_resume` flags."
        ),
    },
    {
        "name": "suggest",
        "description": "Generate AI-rewritten bullet points and keywords targeting the JD gaps.",
    },
    {
        "name": "history",
        "description": "Retrieve the authenticated user's past analysis results.",
    },
    {
        "name": "batch",
        "description": "Rank multiple resumes against a single JD in one request.",
    },
]
