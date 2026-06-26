from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import get_db, User
from app.models.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=201,
    summary="Register a new user",
    description=(
        "Creates a new user account with a bcrypt-hashed password and returns a "
        "signed JWT (HS256, 7-day expiry). The token can be used immediately as a "
        "`Bearer` credential on all protected endpoints."
    ),
)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered.")
    user = User(name=req.name, email=req.email, hashed_password=hash_password(req.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and get a JWT",
    description=(
        "Validates email + password and returns a fresh JWT. "
        "Returns **401** if credentials are invalid."
    ),
)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Returns the profile of the user identified by the `Authorization: Bearer` token.",
)
async def me(user: User = Depends(get_current_user)):
    return user
