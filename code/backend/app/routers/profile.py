"""View and update the logged-in user's profile (FR-03)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileOut(BaseModel):
    id: int
    email: str
    display_name: str
    avatar: str | None = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar: str | None = None


@router.get("", response_model=ProfileOut)
def get_profile(user=Depends(get_current_user)):
    return user


@router.patch("", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if body.display_name is not None:
        new_name = body.display_name.strip()
        if not new_name:
            raise HTTPException(400, "Display name cannot be empty")
        clash = (
            db.query(User)
            .filter(User.display_name == new_name, User.id != user.id)
            .first()
        )
        if clash:
            raise HTTPException(400, "Display name taken")
        user.display_name = new_name

    if body.avatar is not None:
        user.avatar = body.avatar

    db.commit()
    db.refresh(user)
    return user
