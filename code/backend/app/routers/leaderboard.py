"""Global leaderboard (FR-14): one row per user (their best solve), ranked by
fastest time, ties broken by higher efficiency. The caller's own row is
flagged is_me when authenticated (auth is optional — the board is public)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import Solve, User
from app.routers.auth import get_optional_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    display_name: str
    best_time: float
    efficiency: float
    is_me: bool = False


@router.get("", response_model=list[LeaderboardEntry])
def leaderboard(db: Session = Depends(get_db), me: User | None = Depends(get_optional_user)):
    # Best (fastest) solve per user. Data volume for a class project is small,
    # so a single scan + in-Python reduction is simplest and clear.
    best: dict[int, Solve] = {}
    for s in db.query(Solve).all():
        cur = best.get(s.user_id)
        if cur is None or s.solve_time < cur.solve_time:
            best[s.user_id] = s

    ranked = sorted(best.values(), key=lambda s: (s.solve_time, -s.efficiency))[:50]

    # one lookup for the display names we need
    users = {u.id: u for u in db.query(User).filter(User.id.in_(best.keys())).all()} if best else {}

    out = []
    for i, s in enumerate(ranked, start=1):
        u = users.get(s.user_id)
        out.append(
            LeaderboardEntry(
                rank=i,
                user_id=s.user_id,
                display_name=(u.display_name if u else f"user{s.user_id}"),
                best_time=s.solve_time,
                efficiency=s.efficiency,
                is_me=(me is not None and me.id == s.user_id),
            )
        )
    return out
