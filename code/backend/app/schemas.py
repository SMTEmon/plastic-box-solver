from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ScrambleResponse(BaseModel):
    facelets: str
    moves: list[str]


class SolveRequest(BaseModel):
    facelets: str = Field(..., min_length=54, max_length=54)
    method: Literal["optimal", "beginner"] = "optimal"


class Stage(BaseModel):
    name: str
    start: int   # index into moves[] where this stage begins (inclusive)
    end: int     # index where it ends (exclusive); moves[start:end] complete it


class SolveResponse(BaseModel):
    moves: list[str]
    moveCount: int
    stages: list[Stage]
    optimalMoves: list[str]
    optimalMoveCount: int


class ValidateRequest(BaseModel):
    facelets: str


class ValidateResponse(BaseModel):
    valid: bool
    detail: Optional[str] = None


# --- Camera scan (FR-04, FR-06a, FR-17) -------------------------------------

class FaceQuality(BaseModel):
    face: str            # which face this frame is: one of U R F D L B
    blurry: bool         # variance-of-Laplacian too low (prompt retake)
    dark: bool           # mean brightness too low (prompt retake)


class ScanResponse(BaseModel):
    facelets: str                      # detected 54-char canonical state
    valid: bool                        # passed validate.validate()?
    detail: Optional[str] = None       # why invalid, for rescan guidance
    faces: list[FaceQuality]           # per-face capture quality, URFDLB order


# --- Persistence (FR-12a, FR-13a, FR-13b) -----------------------------------

class SolveCreate(BaseModel):
    solve_time: float = Field(..., gt=0)   # seconds the user took
    move_count: int = Field(..., ge=1)     # user's actual move count
    optimal_moves: int = Field(..., ge=0)  # optimalMoveCount from /solve
    method: str = "Beginner"
    scramble: Optional[str] = None
    solution: Optional[str] = None


class SolveOut(BaseModel):
    id: int
    solve_time: float
    move_count: int
    optimal_moves: int
    efficiency: float
    method: str
    created_at: datetime

    class Config:
        from_attributes = True   # read straight off the SQLAlchemy row


class HistoryResponse(BaseModel):
    solves: list[SolveOut]
    personal_best: Optional[SolveOut] = None
