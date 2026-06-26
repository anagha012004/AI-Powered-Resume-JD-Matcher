from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HistoryItemResponse(BaseModel):
    id: int
    resume_filename: Optional[str]
    jd_snippet: str
    match_score: int
    justification: str
    created_at: datetime

    class Config:
        from_attributes = True
