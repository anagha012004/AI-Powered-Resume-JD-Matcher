from fastapi import APIRouter, Depends
from app.models.resume import (
    ResumeParseRequest, ResumeParseResponse, ContactInfo, TFIDFKeyword,
    KeywordExtractRequest, KeywordExtractResponse,
)
from app.services.resume_parser import parse_resume, _tfidf_keywords
from app.services.auth import get_current_user

router = APIRouter(tags=["resume"])


@router.post(
    "/resume/parse",
    response_model=ResumeParseResponse,
    summary="Parse resume into structured sections",
    description=(
        "Splits a resume into labelled sections (contact, summary, skills, experience, "
        "education, projects, certifications, …), scores completeness 0–100, extracts "
        "contact details, and ranks JD keywords by TF-IDF weight with an `in_resume` flag.\n\n"
        "Pass `jd_text` to get TF-IDF keyword comparison. Omit it for section-only parsing.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def parse_resume_endpoint(
    req: ResumeParseRequest,
    _user=Depends(get_current_user),
):
    result = parse_resume(req.resume_text, req.jd_text)
    return ResumeParseResponse(
        sections=result["sections"],
        contact=ContactInfo(**result["contact"]),
        completeness_score=result["completeness_score"],
        missing_sections=result["missing_sections"],
        tfidf_keywords=[TFIDFKeyword(**k) for k in result["tfidf_keywords"]],
    )


@router.post(
    "/keywords/extract",
    response_model=KeywordExtractResponse,
    summary="Extract and rank keywords from text",
    description=(
        "Extracts the top `top_n` keywords from the given text ranked by TF-IDF weight. "
        "Useful for analysing a job description before uploading a resume.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def extract_keywords(
    req: KeywordExtractRequest,
    _user=Depends(get_current_user),
):
    # When only one document, rank by raw TF within that document
    keywords = _tfidf_keywords(req.text, req.text, top_n=req.top_n)
    return KeywordExtractResponse(
        keywords=[TFIDFKeyword(**k) for k in keywords]
    )
