from pydantic import BaseModel
from typing import Optional


class ResumeParseRequest(BaseModel):
    resume_text: str
    jd_text: str = ""


class ContactInfo(BaseModel):
    email:    Optional[str] = None
    phone:    Optional[str] = None
    linkedin: Optional[str] = None
    github:   Optional[str] = None


class TFIDFKeyword(BaseModel):
    keyword:   str
    jd_tf:     float
    score:     float
    in_resume: bool


class ResumeParseResponse(BaseModel):
    sections:           dict[str, str]
    contact:            ContactInfo
    completeness_score: int
    missing_sections:   list[str]
    tfidf_keywords:     list[TFIDFKeyword]


class KeywordExtractRequest(BaseModel):
    text: str
    top_n: int = 30


class KeywordExtractResponse(BaseModel):
    keywords: list[TFIDFKeyword]
