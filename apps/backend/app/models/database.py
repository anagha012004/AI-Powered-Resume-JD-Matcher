import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Text, DateTime, Boolean
from datetime import datetime, timezone
from app.config import settings

_db_url = settings.database_url
for _prefix in ("postgres://", "postgresql://"):
    if _db_url.startswith(_prefix):
        _db_url = _db_url.replace(_prefix, "postgresql+asyncpg://", 1)
        break
# asyncpg does not accept sslmode as a query param — strip it
_db_url = _db_url.split("?sslmode=")[0]

_is_pg = _db_url.startswith("postgresql")
_ssl_ctx = ssl.create_default_context() if _is_pg else None

_pool_kwargs = {"pool_size": 5, "max_overflow": 2, "pool_timeout": 30, "pool_recycle": 1800} if _is_pg else {}

engine = create_async_engine(
    _db_url,
    echo=False,
    **_pool_kwargs,
    connect_args={"ssl": _ssl_ctx} if _is_pg else {},
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class HistoryItem(Base):
    __tablename__ = "history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    jd_snippet: Mapped[str] = mapped_column(String(100))
    match_score: Mapped[int] = mapped_column(Integer)
    justification: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
