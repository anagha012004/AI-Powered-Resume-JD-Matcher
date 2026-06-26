# AI-Powered Resume & JD Matcher

> Upload a master resume, paste a JD, pick a tailoring depth — get a targeted resume, JD match comparison, AI rewrites, cover letter, outreach message, and a PDF export. Powered by a two-stage pipeline of local embeddings + cascading LLM fallback (Gemini 2.0 Flash → Groq → OpenRouter).

---

## Table of Contents

1. [Features](#features)
2. [Demo Screens](#demo-screens)
3. [System Architecture](#system-architecture)
4. [Technical Decisions](#technical-decisions)
5. [Project Structure](#project-structure)
6. [Quick Start](#quick-start)
7. [Running Tests](#running-tests)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)

---

## Features

| Feature | Description |
|---------|-------------|
| **Resume Scoring** | 0–100 match score, role-level verdict (Perfect/Strong/Partial/Weak), section scores (Skills/Experience/Education) |
| **Score Breakdown** | Semantic similarity %, keyword coverage %, resume completeness % |
| **Resume Health** | Section parser (10 section types), completeness ring gauge, contact extraction, TF-IDF keyword bar chart |
| **JD Match** | Side-by-side comparison with highlighted keywords (✓ found / ✗ missing), match %, covered/missing requirements |
| **Tailoring** | Three depths — Light Nudge, Keyword Enhance, Full Tailor — using Gemini 2.0 Flash |
| **Resume Builder** | Section editor (add/reorder/delete), 4 templates, full formatting controls, live preview |
| **PDF Export** | 4 templates: Swiss Single, Swiss Two Column, Modern, Modern Two Column. Adjustable margins, fonts, spacing, accent colour |
| **Cover Letter** | 3 tones (professional / enthusiastic / concise), subject line, copy-to-clipboard |
| **Outreach Message** | Platform-specific (LinkedIn ≤ 300 chars / Email / Cold Email), live char counter |
| **AI Suggestions** | Section-level rewrites with strikethrough diff, keywords-to-add list, summary rewrite |
| **Keyword Extract** | TF-IDF ranked JD keywords with in_resume flag and importance bars |
| **Batch Ranking** | Score N resumes against one JD, return sorted leaderboard |
| **History** | Per-user analysis history with score, filename, JD snippet, date |
| **Auth** | JWT (HS256, 7-day expiry), bcrypt passwords, register/login/me |
| **Caching** | Redis: embeddings (24h TTL) + LLM responses (24h TTL). Cache hits < 5ms |
| **LLM Fallback** | Gemini → Groq → OpenRouter with retry-after extraction and live countdown on 429 |
| **Two-Stage Pipeline** | MiniLM cosine filter at 0.25 threshold saves ~80% of API quota on low matches |

---

## Demo Screens

| Screen | Description |
|--------|-------------|
| `/` | Landing: hero with live score demo, pipeline diagram, feature cards, stats |
| `/register` & `/login` | JWT auth with animated glass card UI |
| `/app` — Score tab | Animated radial gauge, verdict badge, section bars, score breakdown |
| `/app` — Keywords tab | Radar chart + keyword gap pills (click to fix) |
| `/app` — Health tab | Completeness ring, section accordion, TF-IDF keyword bar chart |
| `/app` — Suggestions tab | Diff cards with copy-to-clipboard, "Copy all" button |
| `/app` — History tab | Per-user table sorted newest-first |
| `/builder` — Input tab | Master resume + JD textareas + tailoring depth selector |
| `/builder` — JD Match tab | Match % ring, keyword pills, side-by-side highlighted comparison |
| `/builder` — Builder tab | Section editor + formatting sidebar + 4 template switcher + PDF export |
| `/builder` — Cover Letter tab | Cover letter + outreach with tone/platform picker |

---

## System Architecture

```mermaid
graph TD
    Browser["Browser — Next.js 14\nLanding · Login · Register · /app · /builder\nPOST /api/[...path] catch-all proxy"]
    FastAPI["FastAPI — Python 3.12\n/api/v1/auth · /api/v1/analyze · /api/v1/tailor\n/api/v1/suggest · /api/v1/cover-letter · /api/v1/outreach\n/api/v1/export/pdf · /api/v1/history · /api/v1/batch-rank"]
    Stage1["Stage 1 — Local Embeddings — free, ~50ms\nall-MiniLM-L6-v2 cosine similarity\nbelow 0.25 threshold → return, zero LLM cost"]
    Stage2["Stage 2 — LLM Fallback Chain\n1. Gemini 2.0 Flash\n2. Groq llama-3.3-70b-versatile\n3. OpenRouter llama-3.3-70b-instruct:free"]
    DB["SQLite dev / PostgreSQL prod\nSQLAlchemy async ORM\nTables: users · history"]
    Redis["Redis\nemb:{sha256} — 24h TTL\nscore:{sha256} — 24h TTL"]

    Browser -->|HTTP| FastAPI
    FastAPI --> Stage1
    Stage1 -->|baseline above 0.25| Stage2
    FastAPI --> DB
    FastAPI <-->|cache read/write| Redis
```

---

## Technical Decisions

### Two-Stage Pipeline
MiniLM cosine similarity gates every request. Below 0.25 → return instantly, zero LLM cost. Above → full Gemini analysis. Saves ~80% API quota in practice.

```mermaid
flowchart TD
    Input["Resume Text + JD Text"]
    CacheCheck{"Score cached\nin Redis?"}
    CacheHit["Return cached result\n~5ms"]
    Encode["Encode with all-MiniLM-L6-v2\nL2-normalise to 384-dim vector"]
    EmbCache{"Embeddings\ncached?"}
    EmbStore["Store in Redis TTL 24h"]
    Dot["Dot product = cosine similarity\nbaseline score 0.0 to 1.0"]
    Gate{"baseline\nbelow 0.25?"}
    LowMatch["match_score = baseline x 100\nZero API cost"]
    LLM["LLM Fallback Chain"]
    Parse["Parse JSON response\nMap to AnalyzeResponse fields"]
    CacheWrite["SET score cache TTL 24h"]
    DB["INSERT history row"]
    Response["AnalyzeResponse\nmatch_score · justification · role_level\nstrengths · gaps · section_scores\nmatched_keywords · missing_keywords · ats_flags"]

    Input --> CacheCheck
    CacheCheck -->|hit| CacheHit
    CacheCheck -->|miss| EmbCache
    EmbCache -->|yes| Dot
    EmbCache -->|no| Encode
    Encode --> EmbStore --> Dot
    Dot --> Gate
    Gate -->|yes| LowMatch
    Gate -->|no| LLM
    LLM --> Parse --> CacheWrite --> DB --> Response
    LowMatch --> DB
```

### LLM Fallback Chain with Smart Retry
All three providers (Gemini, Groq, OpenRouter) are tried in order. On 429, `retry_after_seconds` is extracted from the error body, the minimum wait is observed (capped at 35s), then the chain retries once before returning a clean error with a frontend countdown timer.

```mermaid
flowchart TD
    Call["llm_call — system, prompt, temperature"]
    Build["Build ordered provider list\nfrom configured API keys"]
    GeminiKey{"Gemini key set?"}
    Gemini["Call Gemini 2.0 Flash\nvia google-generativeai SDK"]
    GeminiOK{"Parsed OK?"}
    GroqKey{"Groq key set?"}
    Groq["Call Groq\nllama-3.3-70b-versatile"]
    GroqOK{"Parsed OK?"}
    GroqErr{"RateLimitError\nor APIError?"}
    Retry["Extract retry_after_seconds\ncap at 35s — wait — retry once"]
    RetryOK{"Retry\nsucceeded?"}
    OpenKey{"OpenRouter key set?"}
    Open["Call OpenRouter\nllama-3.3-70b-instruct:free"]
    OpenOK{"Parsed OK?"}
    Return["Return dict to caller"]
    Exhausted["HTTP 503\nAll providers exhausted\nretry_after_seconds in response"]

    Call --> Build --> GeminiKey
    GeminiKey -->|yes| Gemini
    GeminiKey -->|no| GroqKey
    Gemini --> GeminiOK
    GeminiOK -->|yes| Return
    GeminiOK -->|no| GroqKey
    GroqKey -->|yes| Groq
    GroqKey -->|no| OpenKey
    Groq --> GroqOK
    GroqOK -->|yes| Return
    GroqOK -->|no| GroqErr
    GroqErr -->|yes| Retry
    GroqErr -->|no| OpenKey
    Retry --> RetryOK
    RetryOK -->|yes| Return
    RetryOK -->|no| OpenKey
    OpenKey -->|yes| Open
    OpenKey -->|no| Exhausted
    Open --> OpenOK
    OpenOK -->|yes| Return
    OpenOK -->|no| Exhausted
```

### TF-IDF Keyword Scoring
Pure Python implementation (no spaCy) — ranks JD keywords by term frequency × IDF-like penalty for terms already in the resume. Highest-scored keywords = most important JD terms you're *missing*.

### Resume Section Parser
Regex heading detector covering 10 section types. Weighted completeness score (experience=30, skills=20, contact=15, education=15, summary=10, …). Contact extraction for email, phone, LinkedIn, GitHub.

### PDF Generation
ReportLab with four templates. Two-column templates use a `Table` flowable to place skills/education in a sidebar. Full formatting controls wired to the frontend builder.

### SQLite → PostgreSQL-Ready
One env var swap: `DATABASE_URL=postgresql+asyncpg://...`. `create_all` handles schema on startup.

---

## Project Structure

```
AI-Powered-Resume-JD-Matcher/
├── apps/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── models/         analyze, auth, batch, builder, database, history, resume, suggest
│   │   │   ├── routes/         analyze, auth, batch, builder, history, resume, suggest
│   │   │   ├── services/       auth, embedder, llm, parser, pdf_builder, resume_parser, scorer, suggester, tailor
│   │   │   ├── cache.py        Redis async helper + sha256 key builders
│   │   │   ├── config.py       pydantic-settings — all env vars typed
│   │   │   ├── docs.py         OpenAPI metadata
│   │   │   ├── main.py         FastAPI app + lifespan + CORS + router registration
│   │   │   └── worker.py       Celery async batch job definitions
│   │   ├── tests/
│   │   │   ├── conftest.py     Session-scoped DB setup, mock fixtures, shared payloads
│   │   │   └── test_analyze.py 24 tests — health, auth, analyze, resume, suggest,
│   │   │                       tailor, cover letter, outreach, batch, history, PDF
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── requirements.txt
│   │   └── .env.example
│   │
│   └── frontend/
│       ├── components/
│       │   ├── AuthContext.tsx    JWT auth state
│       │   ├── AuthForm.tsx       Glass card login/register
│       │   ├── CoverLetter.tsx    Cover letter + outreach generator
│       │   ├── JDMatch.tsx        Side-by-side highlighted comparison
│       │   ├── KeywordChart.tsx   Radar chart + keyword pills
│       │   ├── RankingsTable.tsx  Batch rank leaderboard
│       │   ├── ResumeBuilder.tsx  Full section editor + formatting + PDF export
│       │   ├── ResumeHealth.tsx   Completeness ring + section accordion + TF-IDF bars
│       │   ├── ScoreCard.tsx      Radial gauge + section bars + score breakdown
│       │   ├── SuggestionPanel.tsx Diff cards with copy buttons
│       │   └── UploadZone.tsx     react-dropzone PDF/TXT + paste
│       ├── pages/
│       │   ├── api/[...path].ts  Catch-all proxy → FastAPI
│       │   ├── _app.tsx          AuthProvider wrap
│       │   ├── app.tsx           Dashboard (Score/Keywords/Health/Suggestions/History)
│       │   ├── builder.tsx       Builder workflow (Input/JD Match/Builder/Cover Letter)
│       │   ├── index.tsx         Landing page
│       │   ├── login.tsx
│       │   └── register.tsx
│       └── vercel.json
│
├── render.yaml                   One-click Render deploy blueprint
├── DEPLOYMENT.md                 Full deployment guide
├── README.md
├── .gitignore
├── Resume Matcher.postman_collection.json
└── Resume Matcher.postman_environment.json
```

---

## Quick Start

### 1 — Clone

```bash
git clone <your-repo-url>
cd AI-Powered-Resume-JD-Matcher
```

### 2 — Backend

```bash
cd apps/backend
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and SECRET_KEY at minimum
uv sync --dev --no-install-project
uv run uvicorn app.main:app --reload --port 8000
```

### 3 — Frontend

```bash
cd apps/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### 4 — Redis

```bash
docker run -d -p 6379:6379 redis:alpine
```

---

## Running Tests

```bash
cd apps/backend
uv run pytest -v
```

24 tests, ~22 seconds, no API keys or Redis needed.

---

## Environment Variables

See [DEPLOYMENT.md — Environment Variables Reference](DEPLOYMENT.md#5-environment-variables-reference).

---

## API Reference

All routes prefixed `/api/v1/`. Full interactive docs at `/docs` (Swagger) and `/redoc`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Register → JWT |
| `POST` | `/auth/login` | — | Login → JWT |
| `GET` | `/auth/me` | Bearer | Current user profile |
| `POST` | `/analyze` | Bearer | Score resume vs JD (text) |
| `POST` | `/analyze/upload` | Bearer | Score resume vs JD (PDF/TXT) |
| `POST` | `/resume/parse` | Bearer | Parse sections + TF-IDF keywords |
| `POST` | `/keywords/extract` | Bearer | Rank keywords by TF-IDF |
| `POST` | `/suggest` | Bearer | AI bullet rewrites |
| `POST` | `/tailor` | Bearer | Tailor master resume to JD (3 depths) |
| `POST` | `/cover-letter` | Bearer | Generate cover letter (3 tones) |
| `POST` | `/outreach` | Bearer | Generate outreach (3 platforms) |
| `POST` | `/export/pdf` | Bearer | Export resume to PDF (4 templates) |
| `GET` | `/history` | Bearer | User's past analyses |
| `POST` | `/batch-rank` | Bearer | Rank N resumes vs 1 JD |
| `GET` | `/health` | — | Liveness probe |

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for:
- Local dev setup
- Docker / Docker Compose
- Render (backend) + Vercel (frontend) — free tier, zero config
- PostgreSQL migration
- Getting free API keys
- Troubleshooting
