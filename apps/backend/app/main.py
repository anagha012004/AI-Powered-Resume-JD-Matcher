import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.models.database import init_db
from app.routes import analyze, suggest, history, batch, auth, resume, builder
from app.docs import DESCRIPTION, TAGS_METADATA


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Resume & JD Matcher API",
    version="1.2.0",
    description=DESCRIPTION,
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",
    redoc_url="/redoc",
    contact={"name": "AI Resume Matcher", "url": "https://github.com/your-repo"},
    license_info={"name": "MIT"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}"},
    )


API_PREFIX = "/api/v1"
app.include_router(auth.router,   prefix=API_PREFIX)
app.include_router(analyze.router, prefix=API_PREFIX, tags=["analyze"])
app.include_router(suggest.router, prefix=API_PREFIX, tags=["suggest"])
app.include_router(history.router, prefix=API_PREFIX, tags=["history"])
app.include_router(batch.router,   prefix=API_PREFIX, tags=["batch"])
app.include_router(resume.router,  prefix=API_PREFIX)
app.include_router(builder.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"], summary="Health check")
async def health():
    """Returns `{"status": "ok"}` when the API is running."""
    return {"status": "ok"}
