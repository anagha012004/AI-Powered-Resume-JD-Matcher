from pydantic import BaseModel, Field
from typing import Optional


class AnalyzeRequest(BaseModel):
    resume_text: str
    jd_text: str
    resume_filename: Optional[str] = None


class SectionScores(BaseModel):
    skills: int = Field(ge=0, le=100)
    experience: int = Field(ge=0, le=100)
    education: int = Field(ge=0, le=100)


class ScoreBreakdown(BaseModel):
    semantic_similarity: float = Field(description="Raw cosine similarity 0.0–1.0")
    keyword_coverage:    int   = Field(description="% of JD keywords found in resume")
    completeness:        int   = Field(description="Resume section completeness 0–100")


class AnalyzeResponse(BaseModel):
    match_score: int = Field(ge=0, le=100)
    justification: str
    role_level_match: str = "Unknown"
    strengths: list[str] = []
    gaps: list[str] = []
    matched_keywords: list[str]
    missing_keywords: list[str]
    section_scores: SectionScores
    ats_flags: list[str]
    score_breakdown: Optional[ScoreBreakdown] = None
    cache_hit: bool
    processing_time_ms: int
