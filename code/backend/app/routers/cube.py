from fastapi import APIRouter, HTTPException

from app.cube import solver, validate as validate_mod
from app.cube.scramble import random_scramble
from app.schemas import (
    ScrambleResponse,
    SolveRequest,
    SolveResponse,
    ValidateRequest,
    ValidateResponse,
)

router = APIRouter(prefix="/api/cube", tags=["cube"])


@router.post("/scramble", response_model=ScrambleResponse)
def scramble(n_moves: int = 20):
    facelets, moves = random_scramble(n_moves)
    return ScrambleResponse(facelets=facelets, moves=moves)


@router.post("/validate", response_model=ValidateResponse)
def validate_cube(body: ValidateRequest):
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        return ValidateResponse(valid=False, detail=str(e))
    return ValidateResponse(valid=True)


@router.post("/solve", response_model=SolveResponse)
def solve(body: SolveRequest):
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    optimal = solver.solve_optimal(body.facelets)

    if body.method == "optimal":
        moves = optimal
    else:
        moves = solver.solve_guided(body.facelets, method="Beginner")

    return SolveResponse(
        moves=moves,
        moveCount=len(moves),
        optimalMoves=optimal,
        optimalMoveCount=len(optimal),
    )
