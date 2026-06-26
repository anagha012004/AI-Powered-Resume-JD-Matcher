from fastapi import APIRouter
from app.models.suggest import SuggestRequest, SuggestResponse
from app.services.suggester import get_suggestions

router = APIRouter()


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(req: SuggestRequest):
    result = await get_suggestions(req.resume_text, req.jd_text, req.missing_keywords)
    return SuggestResponse(**result)
