from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.cube import solver, stages as stages_mod, tutorials, validate as validate_mod
from app.cube.scramble import random_scramble
from app.schemas import (
    FaceQuality,
    ScanResponse,
    ScrambleResponse,
    SolveRequest,
    SolveResponse,
    TutorialCaseRequest,
    TutorialCaseResponse,
    TutorialStageInfo,
    ValidateRequest,
    ValidateResponse,
)
from app.vision import detect

router = APIRouter(prefix="/api/cube", tags=["cube"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB limit per image


@router.post("/scramble", response_model=ScrambleResponse)
def scramble(n_moves: int = Query(default=20, ge=1, le=100)):
    n = n_moves if isinstance(n_moves, int) else 20
    facelets, moves = random_scramble(n)
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

    contents = []
    for img in images:
        data = img.file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Image '{img.filename or 'upload'}' exceeds maximum size of 5MB",
            )
        contents.append(data)

    try:
        imgs = [detect._decode(b) for b in contents]
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    faces = [
        FaceQuality(face=letter, **detect.assess_quality(img))
        for letter, img in zip("URFDLB", imgs)
    ]

    try:
        facelets = detect.detect_facelets(imgs)
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

    cfop_moves = solver.solve_guided(body.facelets, method="CFOP")

    if body.method == "optimal":
        moves = solver.solve_optimal(body.facelets)
        stages = (
            [{"name": "Solution", "start": 0, "end": len(moves)}] if moves else []
        )
        return SolveResponse(
            moves=moves,
            moveCount=len(moves),
            stages=stages,
            optimalMoves=cfop_moves,
            optimalMoveCount=len(cfop_moves),
            method_used="optimal",
        )

    # Teaching methods: beginner or cfop
    if body.method == "cfop":
        moves = cfop_moves
        stage_defs = stages_mod.CFOP_STAGES
    else:
        moves = solver.solve_guided(body.facelets, method="Beginner")
        stage_defs = stages_mod.STAGES

    stages = stages_mod.segment(body.facelets, moves, stage_defs)

    return SolveResponse(
        moves=moves,
        moveCount=len(moves),
        stages=stages,
        optimalMoves=cfop_moves,
        optimalMoveCount=len(cfop_moves),
        method_used=body.method,
    )


# --- Tutorial Endpoints -----------------------------------------------------

@router.get("/tutorial/stages", response_model=list[TutorialStageInfo])
def get_tutorial_stages():
    """Returns available tutorial stages and formula categories."""
    return tutorials.get_available_stages()


@router.post("/tutorial/generate", response_model=TutorialCaseResponse)
def generate_tutorial_case(body: TutorialCaseRequest):
    """Dynamically generates a partial cube state for the requested stage."""
    return tutorials.generate_tutorial_case(body.stage_id)
