from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.database import get_db, HistoryItem
from app.models.history import HistoryItemResponse
from app.services.auth import get_current_user

router = APIRouter()


@router.get(
    "/history",
    response_model=list[HistoryItemResponse],
    summary="Get analysis history",
    description=(
        "Returns the authenticated user's past resume analyses, newest first. "
        "Use the `limit` query parameter to cap the number of results (default 50, max sensible cap is ~200).\n\n"
        "**Requires** `Authorization: Bearer <token>`."
    ),
)
async def get_history(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of history items to return"),
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
