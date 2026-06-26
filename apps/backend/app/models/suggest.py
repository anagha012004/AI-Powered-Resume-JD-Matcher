from pydantic import BaseModel
from typing import Optional


class SuggestRequest(BaseModel):
    resume_text: str
    jd_text: str
    missing_keywords: list[str]


class SuggestedEdit(BaseModel):
    section: str
    original: Optional[str]
    suggested: str
    reason: str


class SuggestResponse(BaseModel):
    suggested_edits: list[SuggestedEdit]
    keywords_to_add: list[str]
    summary_rewrite: Optional[str] = None
