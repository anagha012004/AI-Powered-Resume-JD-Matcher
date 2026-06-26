import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.models.analyze import AnalyzeRequest, AnalyzeResponse, SectionScores
from app.services.embedder import cosine_similarity
from app.services.scorer import score_with_gemini
from app.services.parser import parse_pdf, clean_text
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


def _build_response(data: dict, cache_hit: bool, start: float) -> AnalyzeResponse:
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
        cache_hit=cache_hit,
        processing_time_ms=int((time.monotonic() - start) * 1000),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, current_user=Depends(get_current_user)):
    start = time.monotonic()
    cache_key = score_cache_key(req.resume_text, req.jd_text)

    cached = await get_cached(cache_key)
    if cached:
        return _build_response(cached, cache_hit=True, start=start)

    baseline = await cosine_similarity(req.resume_text, req.jd_text)

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

    await set_cached(cache_key, result)
    await _save_history(req, result, user_id=current_user.id)
    return _build_response(result, cache_hit=False, start=start)


@router.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_upload(
    resume_file: UploadFile = File(...),
    jd_text: str = Form(...),
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
    # Pass current_user through by calling the core logic directly
    start = time.monotonic()
    cache_key = score_cache_key(req.resume_text, req.jd_text)
    cached = await get_cached(cache_key)
    if cached:
        return _build_response(cached, cache_hit=True, start=start)
    baseline = await cosine_similarity(req.resume_text, req.jd_text)
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
    await set_cached(cache_key, result)
    await _save_history(req, result, user_id=current_user.id)
    return _build_response(result, cache_hit=False, start=start)
