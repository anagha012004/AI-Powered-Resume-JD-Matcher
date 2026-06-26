from fastapi import APIRouter
from app.models.batch import BatchRankRequest, BatchRankResponse, RankedResume
from app.services.embedder import cosine_similarity
from app.services.scorer import score_with_gemini
from app.config import settings

router = APIRouter()


@router.post("/batch-rank", response_model=BatchRankResponse)
async def batch_rank(req: BatchRankRequest):
    results = []
    for resume in req.resumes:
        baseline = await cosine_similarity(resume.text, req.jd_text)
        if baseline < settings.low_similarity_threshold:
            score_data = {
                "match_score": int(baseline * 100),
                "justification": "Very low semantic match.",
            }
        else:
            score_data = await score_with_gemini(resume.text, req.jd_text, baseline)

        results.append({
            "filename": resume.filename,
            "match_score": score_data["match_score"],
            "justification": score_data["justification"],
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return BatchRankResponse(
        rankings=[RankedResume(rank=i + 1, **r) for i, r in enumerate(results)]
    )
