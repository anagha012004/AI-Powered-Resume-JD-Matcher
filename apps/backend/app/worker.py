from celery import Celery
from app.config import settings

celery_app = Celery(
    "resume_matcher",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]


@celery_app.task(name="tasks.analyze_async")
def analyze_async(resume_text: str, jd_text: str, resume_filename: str | None = None):
    """Celery task for background scoring — used for batch jobs."""
    import asyncio
    from app.services.embedder import cosine_similarity
    from app.services.scorer import score_with_gemini

    async def _run():
        baseline = await cosine_similarity(resume_text, jd_text)
        if baseline < settings.low_similarity_threshold:
            return {"match_score": int(baseline * 100), "justification": "Very low semantic match."}
        return await score_with_gemini(resume_text, jd_text, baseline)

    return asyncio.run(_run())
