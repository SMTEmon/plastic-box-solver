from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.db.database import get_db
from app.db.models import User
from app.utils.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])
# auto_error=False so get_optional_user can treat "no token" as anonymous
# rather than raising — the leaderboard is viewable logged-out.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)   # FR-01: at least 8 characters
    display_name: str | None = None            # defaults to the email local-part


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(400, "Email already registered")

    display_name = (user.display_name or user.email.split("@")[0]).strip()
    if db.query(User).filter(User.display_name == display_name).first():
        raise HTTPException(400, "Display name taken")

    new_user = User(
        email=user.email,
        display_name=display_name,
        hashed_password=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email, "display_name": new_user.display_name}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm's `username` field carries the EMAIL here.
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Wrong email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


# Reusable dependency — any route that needs a logged-in user imports this.
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    email = decode_token(token)
    if not email:
        raise HTTPException(401, "Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# Like get_current_user but returns None instead of raising when there is no
# (or an invalid) token — for endpoints that are public but personalise when
# authenticated, e.g. the leaderboard's "highlight my row".
def get_optional_user(token: str | None = Depends(oauth2_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    email = decode_token(token)
    if not email:
        return None
    return db.query(User).filter(User.email == email).first()
