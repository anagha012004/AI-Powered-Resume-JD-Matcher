# Re-exports for backward compatibility — import from domain modules directly for new code
from app.models.analyze import AnalyzeRequest, AnalyzeResponse, SectionScores
from app.models.suggest import SuggestRequest, SuggestResponse, SuggestedEdit
from app.models.batch import BatchRankRequest, BatchRankResponse, ResumeInput, RankedResume
from app.models.history import HistoryItemResponse

__all__ = [
    "AnalyzeRequest", "AnalyzeResponse", "SectionScores",
    "SuggestRequest", "SuggestResponse", "SuggestedEdit",
    "BatchRankRequest", "BatchRankResponse", "ResumeInput", "RankedResume",
    "HistoryItemResponse",
]
