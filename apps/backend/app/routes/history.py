from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.database import get_db, HistoryItem
from app.models.history import HistoryItemResponse
from app.services.auth import get_current_user

router = APIRouter()


@router.get("/history", response_model=list[HistoryItemResponse])
async def get_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(HistoryItem)
        .where(HistoryItem.user_id == current_user.id)
        .order_by(desc(HistoryItem.created_at))
        .limit(limit)
    )
    return result.scalars().all()
