from pydantic import BaseModel


class ResumeInput(BaseModel):
    filename: str
    text: str


class BatchRankRequest(BaseModel):
    resumes: list[ResumeInput]
    jd_text: str


class RankedResume(BaseModel):
    rank: int
    filename: str
    match_score: int
    justification: str


class BatchRankResponse(BaseModel):
    rankings: list[RankedResume]
