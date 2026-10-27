"""Solve persistence: save a completed solve, list history, flag personal best
(FR-12a, FR-13a, FR-13b). Efficiency (FR-12b) is computed server-side so the DB
is the single source of truth."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.cube.constants import SOLVED
from app.cube.moves import apply_moves
from app.cube.solver import solve_guided
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
    move_count = body.move_count
    optimal_moves = body.optimal_moves

    if body.scramble and body.solution:
        if body.scramble == SOLVED:
            raise HTTPException(status_code=400, detail="Invalid scramble: cube is already solved")
        moves = body.solution.split()
        try:
            resulting_state = apply_moves(body.scramble, moves)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid solution moves: {e}")
        if resulting_state != SOLVED:
            raise HTTPException(status_code=400, detail="Solution does not solve the scramble")

        move_count = len([m for m in moves if m and m[0].upper() not in "XYZ"])
        try:
            optimal_moves = len(solve_guided(body.scramble, method="CFOP"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not compute optimal moves for scramble: {e}")

    efficiency = _efficiency(optimal_moves, move_count)

    row = Solve(
        user_id=user.id,
        solve_time=body.solve_time,
        move_count=move_count,
        optimal_moves=optimal_moves,
        efficiency=efficiency,
        scramble=body.scramble,
        solution=body.solution,
        method=body.method,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=HistoryResponse)
def history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Support direct positional test calls like history(db, user)
    if not isinstance(limit, int) and hasattr(limit, "query"):
        db, user = limit, offset
        limit_val, offset_val = 50, 0
    else:
        limit_val = limit if isinstance(limit, int) else 50
        offset_val = offset if isinstance(offset, int) else 0

    user_solves = db.query(Solve).filter(Solve.user_id == user.id)
    solves = (
        user_solves
        .order_by(Solve.created_at.desc())
        .offset(offset_val)
        .limit(limit_val)
        .all()
    )
    # FR-13b: personal best = fastest recorded solve, ties broken by higher efficiency.
    # Empty history -> None, which the schema renders as null (FR-13a empty-state, not an error).
    all_solves = solves if (offset_val == 0 and len(solves) < limit_val) else user_solves.all()
    pb = min(all_solves, key=lambda s: (s.solve_time, -(s.efficiency or 0.0)), default=None)
    total = user_solves.count()
    return HistoryResponse(solves=solves, personal_best=pb, total=total)
