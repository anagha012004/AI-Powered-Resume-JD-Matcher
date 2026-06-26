from fastapi import APIRouter
from app.models.suggest import SuggestRequest, SuggestResponse
from app.services.suggester import get_suggestions

router = APIRouter()


@router.post(
    "/suggest",
    response_model=SuggestResponse,
    summary="Get AI-rewritten bullet points",
    description=(
        "Given a resume, a job description, and the list of **missing keywords** "
        "(typically taken from a prior `/analyze` response), returns:\n\n"
        "- `suggested_edits` — section-level rewrites with `original` → `suggested` diff and `reason`\n"
        "- `keywords_to_add` — keywords to weave into the resume\n"
        "- `summary_rewrite` — optional rewritten professional summary\n\n"
        "Uses `temperature=0.3` for slightly more creative output while staying grounded."
    ),
)
async def suggest(req: SuggestRequest):
    result = await get_suggestions(req.resume_text, req.jd_text, req.missing_keywords)
    return SuggestResponse(**result)
