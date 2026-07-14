from typing import Literal, Optional

from pydantic import BaseModel, Field


class ScrambleResponse(BaseModel):
    facelets: str
    moves: list[str]


class SolveRequest(BaseModel):
    facelets: str = Field(..., min_length=54, max_length=54)
    method: Literal["optimal", "beginner"] = "optimal"


class SolveResponse(BaseModel):
    moves: list[str]
    moveCount: int
    optimalMoves: list[str]
    optimalMoveCount: int


class ValidateRequest(BaseModel):
    facelets: str


class ValidateResponse(BaseModel):
    valid: bool
    detail: Optional[str] = None
