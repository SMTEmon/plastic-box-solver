from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ScrambleResponse(BaseModel):
    facelets: str
    moves: list[str]


class SolveRequest(BaseModel):
    facelets: str = Field(..., min_length=54, max_length=54)
    # "optimal" = Kociemba, for Auto-Solve. The other two are teaching methods
    # for Guided Mode. Kociemba is deliberately not a guided option: its moves
    # are near-optimal but arbitrary, so there is nothing to learn from them.
    method: Literal["optimal", "beginner", "cfop"] = "optimal"
    # Which colour the user wants to build FIRST (the bottom layer). Teaching
    # methods always solve the D face first, so this is achieved by rotating
    # the whole cube before solving and prepending that rotation to the
    # solution -- which is exactly what a tutorial means by "hold the cube with
    # white on the bottom". Ignored for method="optimal".
    firstColour: Optional[Literal["w", "y", "r", "o", "g", "b"]] = None


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
    # Which method actually produced `moves`. Not always what was requested:
    # CFOP fails on ~15% of cubes inside rubik_solver, and we fall back to the
    # beginner method rather than returning an error. The UI says so.
    method: str = "optimal"
    methodLabel: str = "Kociemba two-phase"
    fellBack: bool = False
    # The colour actually built first, and the reorientation that set it up.
    # prepMoves are the leading entries of `moves`, repeated here so the UI can
    # explain the first step rather than showing a bare "Y'".
    firstColour: Optional[str] = None
    prepMoves: list[str] = []


# --- Method comparison (FR-08a vs FR-08b) -----------------------------------

class MethodResult(BaseModel):
    method: str            # "optimal" | "beginner" | "cfop"
    label: str             # human name
    available: bool        # did it produce a solution for this cube?
    moveCount: int = 0
    moves: list[str] = []
    detail: str | None = None   # why it failed, when available is False
    note: str = ""              # what this method is for


class CompareResponse(BaseModel):
    facelets: str
    results: list[MethodResult]


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
