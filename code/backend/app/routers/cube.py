from fastapi import APIRouter, File, HTTPException, UploadFile

from app.cube import solver, stages as stages_mod, validate as validate_mod
from app.cube.scramble import random_scramble
from app.schemas import (
    FaceQuality,
    ScanResponse,
    ScrambleResponse,
    SolveRequest,
    SolveResponse,
    ValidateRequest,
    ValidateResponse,
)
from app.vision import detect

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


@router.post("/scan", response_model=ScanResponse)
def scan(images: list[UploadFile] = File(...)):
    """Extract a cube state from six face photos (URFDLB order).

    Returns the detected 54-char facelets even when validation fails, so the
    frontend can drop it into the 2D net editor for correction (FR-06c) and flag
    which face(s) to rescan (FR-04, FR-06b).
    """
    if len(images) != 6:
        raise HTTPException(
            status_code=422,
            detail=f"expected 6 face images in URFDLB order, got {len(images)}",
        )

    contents = [img.file.read() for img in images]

    faces = [
        FaceQuality(face=letter, **detect.assess_quality(data))
        for letter, data in zip("URFDLB", contents)
    ]

    def _is_legal(fl: str) -> bool:
        try:
            validate_mod.validate(fl)
            return True
        except ValueError:
            return False

    # detect_best retries with a few white/colour cutoffs when the first
    # reading is not a legal cube. One misread sticker invalidates the whole
    # scan, and the usual culprit is a washed-out white or a colour-cast white
    # sitting right on the boundary.
    try:
        facelets, _bias, _retried = detect.detect_best(contents, _is_legal)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        validate_mod.validate(facelets)
    except ValueError as e:
        return ScanResponse(facelets=facelets, valid=False, detail=str(e), faces=faces)
    return ScanResponse(facelets=facelets, valid=True, faces=faces)


@router.post("/solve", response_model=SolveResponse)
def solve(body: SolveRequest):
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    optimal = solver.solve_optimal(body.facelets)

    if body.method == "optimal":
        moves = optimal
        # Auto-Solve has no teaching stages; expose one segment for the UI.
        stages = (
            [{"name": "Solution", "start": 0, "end": len(moves)}] if moves else []
        )
    else:
        moves = solver.solve_guided(body.facelets, method="Beginner")
        stages = stages_mod.segment(body.facelets, moves)

    return SolveResponse(
        moves=moves,
        moveCount=len(moves),
        stages=stages,
        optimalMoves=optimal,
        optimalMoveCount=len(optimal),
    )
