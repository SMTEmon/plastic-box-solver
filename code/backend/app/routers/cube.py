from fastapi import APIRouter, File, HTTPException, UploadFile

from app.cube import solver, stages as stages_mod, validate as validate_mod
from app.cube.scramble import random_scramble
from app.schemas import (
    CompareResponse,
    FaceQuality,
    MethodResult,
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


# API method name -> rubik_solver's own name for the same thing.
_TEACHING = {"beginner": "Beginner", "cfop": "CFOP"}

_METHOD_NOTES = {
    "optimal": "Near-optimal. Fast and short, but the moves teach you nothing — this is what Auto-Solve plays.",
    "beginner": "The method people are actually taught. Longest, but every step has a reason you can follow.",
    "cfop": "What speedcubers use. Roughly half the moves of the beginner method because it builds the first two layers together.",
}


@router.post("/solve", response_model=SolveResponse)
def solve(body: SolveRequest):
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Always computed: it is the efficiency denominator (FR-12b) even when the
    # user is running a teaching method.
    optimal = solver.solve_optimal(body.facelets)

    if body.method == "optimal":
        moves = optimal
        # Auto-Solve has no teaching stages; expose one segment for the UI.
        stages = (
            [{"name": "Solution", "start": 0, "end": len(moves)}] if moves else []
        )
        return SolveResponse(
            moves=moves,
            moveCount=len(moves),
            stages=stages,
            optimalMoves=optimal,
            optimalMoveCount=len(optimal),
            method="optimal",
            methodLabel="Kociemba two-phase",
        )

    requested = _TEACHING[body.method]
    moves, used, prep = solver.solve_teaching(
        body.facelets, method=requested, first_colour=body.firstColour
    )
    # Segment against the ORIGINAL facelets and the full list, so the stage
    # indices line up with what the UI steps through. The prep rotation folds
    # into stage one, which is right: "hold it with white down" IS step one.
    stages = stages_mod.segment(body.facelets, moves, method=used)

    return SolveResponse(
        moves=moves,
        moveCount=len(moves),
        stages=stages,
        optimalMoves=optimal,
        optimalMoveCount=len(optimal),
        method=used.lower(),
        methodLabel=solver.TEACHING_METHODS[used],
        fellBack=(used != requested),
        firstColour=body.firstColour or body.facelets[3 * 9 + 4],
        prepMoves=prep,
    )


@router.post("/compare", response_model=CompareResponse)
def compare(body: ValidateRequest):
    """Solve the same cube three ways, for a side-by-side comparison.

    This is the clearest way to show why the project uses more than one solver:
    Kociemba is short and unreadable, the beginner method is long and
    teachable, CFOP sits in between. Run on one cube, the difference is
    obvious.
    """
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    results = []

    try:
        optimal = solver.solve_optimal(body.facelets)
        results.append(MethodResult(
            method="optimal", label="Kociemba two-phase", available=True,
            moveCount=len(optimal), moves=optimal, note=_METHOD_NOTES["optimal"],
        ))
    except Exception as e:
        results.append(MethodResult(
            method="optimal", label="Kociemba two-phase", available=False,
            detail=str(e), note=_METHOD_NOTES["optimal"],
        ))

    for api_name, rs_name in _TEACHING.items():
        try:
            # Deliberately NOT solve_teaching here: a comparison that silently
            # substituted the beginner method for CFOP would be a lie about
            # what CFOP did on this cube.
            moves = solver.solve_guided(body.facelets, method=rs_name)
            results.append(MethodResult(
                method=api_name, label=solver.TEACHING_METHODS[rs_name],
                available=True, moveCount=len(moves), moves=moves,
                note=_METHOD_NOTES[api_name],
            ))
        except Exception as e:
            results.append(MethodResult(
                method=api_name, label=solver.TEACHING_METHODS[rs_name],
                available=False,
                detail=f"{type(e).__name__} inside rubik_solver — this cube "
                       f"trips a bug in the library; Guided Mode falls back to "
                       f"the beginner method.",
                note=_METHOD_NOTES[api_name],
            ))

    return CompareResponse(facelets=body.facelets, results=results)
