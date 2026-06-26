import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.models.analyze import AnalyzeRequest, AnalyzeResponse, SectionScores, ScoreBreakdown
from app.services.embedder import cosine_similarity
from app.services.scorer import score_with_gemini
from app.services.parser import parse_pdf, clean_text
from app.services.resume_parser import parse_resume
from app.cache import get_cached, set_cached, score_cache_key
from app.models.database import SessionLocal, HistoryItem
from app.services.auth import get_current_user
from app.config import settings

router = APIRouter()


async def _save_history(req: AnalyzeRequest, result: dict, user_id: int | None = None):
    async with SessionLocal() as db:
        item = HistoryItem(
            user_id=user_id,
            resume_filename=req.resume_filename,
            jd_snippet=req.jd_text[:100],
            match_score=result["match_score"],
            justification=result["justification"],
        )
        db.add(item)
        await db.commit()


def _build_breakdown(
    baseline: float,
    matched_keywords: list[str],
    missing_keywords: list[str],
    completeness: int,
) -> ScoreBreakdown:
    total_kw = len(matched_keywords) + len(missing_keywords)
    kw_coverage = int(len(matched_keywords) / total_kw * 100) if total_kw > 0 else 0
    return ScoreBreakdown(
        semantic_similarity=round(baseline, 4),
        keyword_coverage=kw_coverage,
        completeness=completeness,
    )


def _build_response(
    data: dict,
    cache_hit: bool,
    start: float,
    breakdown: ScoreBreakdown | None = None,
) -> AnalyzeResponse:
    return AnalyzeResponse(
        match_score=data["match_score"],
        justification=data["justification"],
        role_level_match=data.get("role_level_match", "Unknown"),
        strengths=data.get("strengths", []),
        gaps=data.get("gaps", []),
        matched_keywords=data.get("matched_keywords", []),
        missing_keywords=data.get("missing_keywords", []),
        section_scores=SectionScores(
            **data.get("section_scores", {"skills": 0, "experience": 0, "education": 0})
        ),
        ats_flags=data.get("ats_flags", []),
        score_breakdown=breakdown,
        cache_hit=cache_hit,
        processing_time_ms=int((time.monotonic() - start) * 1000),
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Score a resume against a JD (text)",
    description=(
        "**Two-stage pipeline:**\n\n"
        "1. Local MiniLM cosine similarity (~50 ms, free). If score < `LOW_SIMILARITY_THRESHOLD` "
        "(default 0.25) the request returns immediately with zero LLM cost.\n"
        "2. Gemini 2.0 Flash → Groq → OpenRouter fallback chain for deep analysis.\n\n"
        "Response now includes `score_breakdown` with semantic similarity, keyword coverage %, "
        "and resume completeness score.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def analyze(req: AnalyzeRequest, current_user=Depends(get_current_user)):
    start = time.monotonic()
    cache_key = score_cache_key(req.resume_text, req.jd_text)

    cached = await get_cached(cache_key)
    baseline = await cosine_similarity(req.resume_text, req.jd_text)
    parsed = parse_resume(req.resume_text, req.jd_text)

    if cached:
        breakdown = _build_breakdown(
            baseline,
            cached.get("matched_keywords", []),
            cached.get("missing_keywords", []),
            parsed["completeness_score"],
        )
        return _build_response(cached, cache_hit=True, start=start, breakdown=breakdown)

    if baseline < settings.low_similarity_threshold:
        result = {
            "match_score": int(baseline * 100),
            "justification": "Very low semantic match between resume and job description.",
            "matched_keywords": [],
            "missing_keywords": [],
            "section_scores": {"skills": 0, "experience": 0, "education": 0},
            "ats_flags": [],
        }
    else:
        result = await score_with_gemini(req.resume_text, req.jd_text, baseline)

    breakdown = _build_breakdown(
        baseline,
        result.get("matched_keywords", []),
        result.get("missing_keywords", []),
        parsed["completeness_score"],
    )

    await set_cached(cache_key, result)
    await _save_history(req, result, user_id=current_user.id)
    return _build_response(result, cache_hit=False, start=start, breakdown=breakdown)


@router.post(
    "/analyze/upload",
    response_model=AnalyzeResponse,
    summary="Score a resume against a JD (file upload)",
    description=(
        "Accepts a **multipart/form-data** request with:\n\n"
        "- `resume_file` — PDF (`.pdf`) or plain-text (`.txt`) file\n"
        "- `jd_text` — Job description as a plain-text form field\n\n"
        "PDF text is extracted with `pdfplumber`. Same two-stage pipeline and Redis caching "
        "as `POST /analyze`. Response includes `score_breakdown`.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def analyze_upload(
    resume_file: UploadFile = File(..., description="PDF or plain-text resume file"),
    jd_text: str = Form(..., description="Job description text"),
    current_user=Depends(get_current_user),
):
    if resume_file.content_type not in ("application/pdf", "text/plain"):
        raise HTTPException(status_code=400, detail="Only PDF or plain text files accepted.")
    raw = await resume_file.read()
    resume_text = (
        parse_pdf(raw) if resume_file.content_type == "application/pdf"
        else raw.decode("utf-8", errors="ignore")
    )
    req = AnalyzeRequest(
        resume_text=clean_text(resume_text),
        jd_text=clean_text(jd_text),
        resume_filename=resume_file.filename,
    )
    start = time.monotonic()
    cache_key = score_cache_key(req.resume_text, req.jd_text)
    cached = await get_cached(cache_key)
    baseline = await cosine_similarity(req.resume_text, req.jd_text)
    parsed = parse_resume(req.resume_text, req.jd_text)

    if cached:
        breakdown = _build_breakdown(
            baseline,
            cached.get("matched_keywords", []),
            cached.get("missing_keywords", []),
            parsed["completeness_score"],
        )
        return _build_response(cached, cache_hit=True, start=start, breakdown=breakdown)

    if baseline < settings.low_similarity_threshold:
        result = {
            "match_score": int(baseline * 100),
            "justification": "Very low semantic match between resume and job description.",
            "matched_keywords": [], "missing_keywords": [],
            "section_scores": {"skills": 0, "experience": 0, "education": 0},
            "ats_flags": [],
        }
    else:
        result = await score_with_gemini(req.resume_text, req.jd_text, baseline)

    breakdown = _build_breakdown(
        baseline,
        result.get("matched_keywords", []),
        result.get("missing_keywords", []),
        parsed["completeness_score"],
    )
    await set_cached(cache_key, result)
    await _save_history(req, result, user_id=current_user.id)
    return _build_response(result, cache_hit=False, start=start, breakdown=breakdown)
