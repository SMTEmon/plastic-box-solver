"""Solve persistence: save a completed solve, list history, flag personal best
(FR-12a, FR-13a, FR-13b). Efficiency (FR-12b) is computed server-side so the DB
is the single source of truth."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Solve
from app.routers.auth import get_current_user
from app.schemas import HistoryResponse, SolveCreate, SolveOut

router = APIRouter(prefix="/api/solves", tags=["solves"])


def _efficiency(optimal_moves: int, move_count: int) -> float:
    """optimal / actual, as a percent, capped at 100 (FR-12b)."""
    if move_count <= 0:
        return 0.0
    return round(min(100.0, optimal_moves / move_count * 100), 2)


@router.post("", response_model=SolveOut)
def create_solve(body: SolveCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = Solve(
        user_id=user.id,
        solve_time=body.solve_time,
        move_count=body.move_count,
        optimal_moves=body.optimal_moves,
        efficiency=_efficiency(body.optimal_moves, body.move_count),
        scramble=body.scramble,
        solution=body.solution,
        method=body.method,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=HistoryResponse)
def history(db: Session = Depends(get_db), user=Depends(get_current_user)):
    solves = (
        db.query(Solve)
        .filter(Solve.user_id == user.id)
        .order_by(Solve.created_at.desc())
        .all()
    )
    # FR-13b: personal best = fastest recorded solve. Empty history -> None,
    # which the schema renders as null (FR-13a empty-state, not an error).
    pb = min(solves, key=lambda s: s.solve_time, default=None)
    return HistoryResponse(solves=solves, personal_best=pb)
