# AI-Powered Resume & JD Matcher

Score a resume against a job description (0–100), explain the match, suggest targeted edits, and rank multiple resumes — powered by a two-stage AI pipeline (local embeddings + Gemini 1.5 Flash).

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12.x | Backend runtime |
| uv | any | Python package manager |
| Node.js | 18+ | Frontend runtime |
| Redis | any | Caching + Celery broker |
| Gemini API key | — | [Get free key](https://aistudio.google.com/app/apikey) |

---

### 1 — Clone & enter the project

```bash
git clone <your-repo-url>
cd AI-Powered-Resume-JD-Matcher
```

---

### 2 — Backend setup

```bash
cd apps/backend

# Create .env from template
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379        # or your Upstash URL
DATABASE_URL=sqlite+aiosqlite:///./resume_matcher.db
```

Install dependencies and start the server:

```bash
# Install all deps into an isolated .venv (Python 3.12 enforced)
uv sync --dev --no-install-project

# Start backend
uv run uvicorn app.main:app --reload --port 8000
```

Backend is live at **http://localhost:8000**
Interactive API docs: **http://localhost:8000/docs**

---

### 3 — Frontend setup

```bash
cd apps/frontend

cp .env.local.example .env.local   # default points to localhost:8000

npm install
npm run dev
```

Frontend is live at **http://localhost:3000**

---

### 4 — Run tests

```bash
cd apps/backend
uv run pytest
```

---

### 5 — (Optional) Celery worker for async batch jobs

```bash
cd apps/backend
uv run celery -A app.worker.celery_app worker --loglevel=info
```

---

### 6 — (Optional) Redis via Docker if not installed locally

```bash
docker run -d -p 6379:6379 redis:alpine
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `DATABASE_URL` | `sqlite+aiosqlite:///./resume_matcher.db` | SQLAlchemy async DB URL |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/0` | Celery result store |
| `LOW_SIMILARITY_THRESHOLD` | `0.25` | Cosine score below which Gemini is skipped |
| `CACHE_TTL` | `86400` | Redis TTL in seconds (24 hours) |

---

## Project Structure

```
AI-Powered-Resume-JD-Matcher/
├── apps/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── config.py              # Central settings via pydantic-settings
│   │   │   ├── cache.py               # Redis async helper (get/set, sha256 keys)
│   │   │   ├── main.py                # FastAPI app, CORS, lifespan, router registration
│   │   │   ├── worker.py              # Celery task definitions
│   │   │   │
│   │   │   ├── models/                # Data layer — split by domain
│   │   │   │   ├── database.py        # SQLAlchemy async engine + HistoryItem ORM model
│   │   │   │   ├── analyze.py         # AnalyzeRequest / AnalyzeResponse / SectionScores
│   │   │   │   ├── suggest.py         # SuggestRequest / SuggestResponse / SuggestedEdit
│   │   │   │   ├── batch.py           # BatchRankRequest / BatchRankResponse / RankedResume
│   │   │   │   ├── history.py         # HistoryItemResponse
│   │   │   │   └── schemas.py         # Re-exports all models (backward compat)
│   │   │   │
│   │   │   ├── services/              # Business logic — each file has one responsibility
│   │   │   │   ├── parser.py          # pdfplumber PDF extraction + regex entity extraction
│   │   │   │   ├── embedder.py        # sentence-transformers + Redis-cached embeddings
│   │   │   │   ├── scorer.py          # Gemini 1.5 Flash scoring prompt + JSON parser
│   │   │   │   └── suggester.py       # Gemini suggestion prompt
│   │   │   │
│   │   │   └── routes/                # FastAPI routers — one file per endpoint group
│   │   │       ├── analyze.py         # POST /api/v1/analyze, POST /api/v1/analyze/upload
│   │   │       ├── suggest.py         # POST /api/v1/suggest
│   │   │       ├── history.py         # GET  /api/v1/history
│   │   │       └── batch.py           # POST /api/v1/batch-rank
│   │   │
│   │   ├── tests/
│   │   │   ├── conftest.py            # Shared fixtures + env var patching
│   │   │   └── test_analyze.py        # Pytest async tests (mocked Gemini + Redis)
│   │   │
│   │   ├── pyproject.toml             # uv project config + dependencies
│   │   ├── pytest.ini                 # asyncio_mode = auto
│   │   └── .env.example               # Environment variable template
│   │
│   └── frontend/
│       ├── components/
│       │   ├── UploadZone.tsx          # Drag-drop PDF + text input (react-dropzone)
│       │   ├── ScoreCard.tsx           # Radial gauge (Recharts), color-coded score
│       │   ├── KeywordChart.tsx        # Matched vs missing bar chart, click-to-suggest
│       │   ├── SuggestionPanel.tsx     # Diff cards: strikethrough original + green suggested
│       │   └── RankingsTable.tsx       # Sortable multi-resume leaderboard
│       ├── pages/
│       │   ├── _app.tsx               # Global CSS injection
│       │   ├── index.tsx              # Main page — wires all components
│       │   └── api/[...path].ts       # Catch-all proxy to FastAPI (avoids CORS)
│       ├── styles/globals.css
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── .env.local.example
│
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/analyze` | Score resume text vs JD |
| `POST` | `/api/v1/analyze/upload` | Score uploaded PDF vs JD |
| `POST` | `/api/v1/suggest` | Get resume edit suggestions |
| `GET`  | `/api/v1/history` | Fetch past analysis records |
| `POST` | `/api/v1/batch-rank` | Rank multiple resumes against one JD |
| `GET`  | `/health` | Health check |

---

## System Architecture

```
Browser (Next.js 14)
  │  Drag-drop PDF / paste text
  │  POST /api/[...path]  ← Next.js catch-all proxy (keeps backend URL server-side)
  ▼
FastAPI (Python 3.12)
  │
  ├─ Stage 1 — sentence-transformers (all-MiniLM-L6-v2)  [free, ~50ms, no API cost]
  │     └─ cosine similarity → baseline_score (0.0–1.0)
  │     └─ Redis cache  key = emb:{sha256(text)}
  │     └─ if cosine < 0.25 → return low-match response immediately
  │
  ├─ Stage 2 — Gemini 1.5 Flash  [only called when cosine ≥ 0.25]
  │     └─ structured JSON prompt → match_score, keywords, section scores, ATS flags
  │     └─ Redis cache  key = score:{sha256(resume)}:{sha256(jd)}
  │
  ├─ SQLite (SQLAlchemy async + aiosqlite) → history persistence
  └─ Celery + Redis → async batch ranking jobs
```

---

## Technical Decisions

**Two-stage pipeline** — Local embeddings gate the expensive Gemini call. Resumes with cosine < 0.25 are rejected in ~50ms with zero API cost, saving quota for meaningful matches.

**Gemini 1.5 Flash** — Free tier is generous (1M TPM), structured JSON output via prompt engineering is reliable, and the 1M token context window handles long resumes + JDs comfortably.

**sentence-transformers all-MiniLM-L6-v2** — 384-dim model, runs locally, no API cost. Embeddings are L2-normalized so dot product equals cosine similarity directly.

**Redis caching (Upstash free tier)** — 24hr TTL on both embedding vectors and full score responses. Identical resume+JD pairs are served in <5ms from cache.

**Regex-based entity extraction** — Replaces spaCy NER to avoid the pydantic v1/v2 conflict on Python 3.12. Covers the same tech keyword extraction use case with zero compilation overhead.

**SQLite → PostgreSQL-ready** — SQLAlchemy async ORM with `aiosqlite` for dev. Switch to PostgreSQL by changing `DATABASE_URL` to `postgresql+asyncpg://...`.

**Modular schema layout** — Each domain (`analyze`, `suggest`, `batch`, `history`) has its own Pydantic models file. `schemas.py` re-exports all of them for backward compatibility.

**pydantic-settings `config.py`** — All environment variables are declared once with types and defaults. No `os.getenv()` scattered across files.

---

## Prompt Engineering

**Scoring prompt** — Sends resume (truncated to 8k chars), JD (4k chars), and the pre-computed cosine similarity as a reference signal so Gemini calibrates its score against objective semantic distance rather than pure keyword spotting. Temperature: `0.1`.

**Suggestion prompt** — Explicitly passes the list of missing keywords so Gemini focuses rewrites on gaps rather than general improvements. Temperature: `0.3` for slightly more creative rewrites.

Both prompts instruct the model to return **only raw JSON** with no markdown fences. A fence-stripping fallback handles occasional non-compliance.

---

## Deployment (Render.com)

```yaml
# Backend web service
startCommand: uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Environment variables to set in Render dashboard:
GEMINI_API_KEY=...
REDIS_URL=...          # Upstash free tier
DATABASE_URL=postgresql+asyncpg://...   # Render PostgreSQL add-on
```

Frontend: Deploy `apps/frontend` to Vercel or Render static site.
Set `NEXT_PUBLIC_API_URL` to your backend's Render URL.
