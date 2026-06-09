import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy import select, func, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.models.admin import AdminUser

router = APIRouter(prefix="/admin", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _verify_token(authorization: str = Header(None, alias="Authorization")) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    try:
        token = authorization.split(" ", 1)[1]
        return jwt.decode(token, settings.admin_jwt_secret, algorithms=[settings.admin_jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已过期")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "admin"


class ChangePasswordRequest(BaseModel):
    password: str


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.admin_jwt_secret, algorithm=settings.admin_jwt_algorithm)


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == req.username)
    )
    user = result.scalars().first()

    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token({"sub": user.username, "role": user.role})
    return LoginResponse(access_token=token)


# ── Admin User Management ────────────────────────────────────────

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _token: dict = Depends(_verify_token),
):
    """List all admin users."""
    result = await db.execute(
        select(AdminUser).order_by(AdminUser.created_at.desc())
    )
    users = result.scalars().all()
    return {
        "items": [
            {
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "admin"


@router.post("/users")
async def create_user(
    req: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _token: dict = Depends(_verify_token),
):
    """Create a new admin user."""
    existing = await db.execute(select(AdminUser).where(AdminUser.username == req.username))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="用户名已存在")
    user = AdminUser(
        id=str(uuid.uuid4()),
        username=req.username,
        password_hash=pwd_context.hash(req.password),
        role=req.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role, "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _token: dict = Depends(_verify_token),
):
    """Delete an admin user (cannot delete yourself)."""
    if _token.get("sub") and user_id:
        result = await db.execute(select(AdminUser).where(AdminUser.username == _token["sub"]))
        current_user = result.scalars().first()
        if current_user and current_user.id == user_id:
            raise HTTPException(status_code=400, detail="不能删除自己的账号")

    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    await db.delete(user)
    await db.commit()
    return {"ok": True}


class ChangePasswordRequest(BaseModel):
    password: str


@router.put("/users/{user_id}/password")
async def change_password(
    user_id: str,
    req: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    _token: dict = Depends(_verify_token),
):
    """Change an admin user's password."""
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.password_hash = pwd_context.hash(req.password)
    await db.commit()
    return {"ok": True}


@router.put("/users/{user_id}/toggle")
async def toggle_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _token: dict = Depends(_verify_token),
):
    """Toggle admin user active status (cannot disable yourself)."""
    if _token.get("sub") and user_id:
        result = await db.execute(select(AdminUser).where(AdminUser.username == _token["sub"]))
        current_user = result.scalars().first()
        if current_user and current_user.id == user_id:
            raise HTTPException(status_code=400, detail="不能禁用自己的账号")

    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_active = not user.is_active
    await db.commit()
    return {"id": user.id, "is_active": user.is_active}
