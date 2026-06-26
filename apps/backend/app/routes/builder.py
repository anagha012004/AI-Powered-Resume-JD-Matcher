from fastapi import APIRouter, Depends
from fastapi.responses import Response
from app.models.builder import (
    TailorRequest, TailorResponse, JDMatch, HighlightedKeyword,
    CoverLetterRequest, CoverLetterResponse,
    OutreachRequest, OutreachResponse,
    PDFExportRequest,
)
from app.services.tailor import tailor_resume, generate_cover_letter, generate_outreach
from app.services.pdf_builder import build_pdf
from app.services.auth import get_current_user

router = APIRouter(tags=["builder"])


@router.post(
    "/tailor",
    response_model=TailorResponse,
    summary="Tailor a master resume to a JD",
    description=(
        "Three tailoring depths:\n\n"
        "- `light` — fix 2-3 bullets that most directly address missing keywords\n"
        "- `keywords` — weave missing keywords naturally into existing content\n"
        "- `full` — rewrite summary, reorder bullets, mirror JD language throughout\n\n"
        "Returns the tailored resume text and a `jd_match` block with highlighted keywords "
        "and match percentage.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def tailor(req: TailorRequest, _user=Depends(get_current_user)):
    result = await tailor_resume(req.master_resume, req.jd_text, req.depth)
    jd = result["jd_match"]
    return TailorResponse(
        tailored_resume=result["tailored_resume"],
        changes_summary=result["changes_summary"],
        jd_match=JDMatch(
            match_percentage=jd["match_percentage"],
            highlighted_keywords=[HighlightedKeyword(**k) for k in jd["highlighted_keywords"]],
            covered_requirements=jd.get("covered_requirements", []),
            missing_requirements=jd.get("missing_requirements", []),
        ),
    )


@router.post(
    "/cover-letter",
    response_model=CoverLetterResponse,
    summary="Generate a cover letter",
    description=(
        "Generates a 3-4 paragraph cover letter tailored to the resume and JD. "
        "Tone options: `professional`, `enthusiastic`, `concise`.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def cover_letter(req: CoverLetterRequest, _user=Depends(get_current_user)):
    result = await generate_cover_letter(req.resume_text, req.jd_text, req.tone)
    return CoverLetterResponse(
        cover_letter=result.get("cover_letter", ""),
        subject_line=result.get("subject_line", "Application"),
    )


@router.post(
    "/outreach",
    response_model=OutreachResponse,
    summary="Generate an outreach message",
    description=(
        "Platform-specific outreach:\n\n"
        "- `linkedin` — ≤ 300 chars, punchy, specific hook from JD\n"
        "- `email` — subject + 2-paragraph body\n"
        "- `cold_email` — subject + 3-paragraph value-first body\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def outreach(req: OutreachRequest, _user=Depends(get_current_user)):
    result = await generate_outreach(req.resume_text, req.jd_text, req.platform)
    return OutreachResponse(
        message=result.get("message", ""),
        subject=result.get("subject"),
    )


@router.post(
    "/export/pdf",
    summary="Export resume to PDF",
    description=(
        "Renders a structured `ResumeData` object to a PDF using the chosen template and "
        "formatting options. Returns the raw PDF bytes with `Content-Type: application/pdf`.\n\n"
        "Templates: `swiss_single`, `swiss_two`, `modern`, `modern_two`.\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
async def export_pdf(req: PDFExportRequest, _user=Depends(get_current_user)):
    pdf_bytes = build_pdf(req.resume, req.template, req.formatting)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=resume.pdf"},
    )
