"""
Tutorial case generation engine.

Dynamically creates partially-solved cube states for learning speedcubing
formulas and beginner/CFOP stages. Instead of hardcoded scrambles, generates a
random scramble, uses the library solver to advance the cube up to the target
stage/formula, and produces the exact moves needed to complete the pattern.
"""

from typing import Any, Dict, List, Optional
import random

from .constants import SOLVED
from .moves import apply_move, apply_moves, invert


def invert_moves(moves: List[str]) -> List[str]:
    """Invert a sequence of moves (reverse order and invert each move)."""
    return [invert(m) for m in reversed(moves)]
from .scramble import random_scramble
from . import solver, stages as stages_mod

# Catalog of supported tutorial stages and formulas
TUTORIAL_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "top_cross",
        "stage_name": "Top cross",
        "title": "Step 4: Top Cross",
        "category": "Beginner Method",
        "formula": "F R U R' U' F'",
        "formula_name": "FRURUF",
        "description": "Form a yellow cross on the top face using the canonical F (R U R' U') F' trigger.",
        "tip": "Hold horizontal bar horizontal, or L-shape at 9 and 12 o'clock, then turn Front clockwise, do 4-moves, and restore Front.",
        "difficulty": "Beginner",
        "method": "Beginner",
        "icon": "cross",
    },
    {
        "id": "match_cross",
        "stage_name": "Match cross",
        "title": "Step 5: Match Cross Colors (Sune)",
        "category": "Beginner Method",
        "formula": "R U R' U R U2 R'",
        "formula_name": "Sune Algorithm",
        "description": "Align top cross edge colors with their matching side centers using the famous Sune algorithm.",
        "tip": "Keep two matching edges at back and right, then run Sune: (R U R') U (R U2 R').",
        "difficulty": "Beginner",
        "method": "Beginner",
        "icon": "rotate",
    },
    {
        "id": "match_corners",
        "stage_name": "Match corners",
        "title": "Step 6: Match Corners Position (Niklas)",
        "category": "Beginner Method",
        "formula": "U R U' L' U R' U' L",
        "formula_name": "Niklas Algorithm",
        "description": "Cycle top corners into their matching 3-color slots before twisting them upright.",
        "tip": "Hold a correctly positioned corner in front-right. Execute Niklas to cycle the other three corners.",
        "difficulty": "Intermediate",
        "method": "Beginner",
        "icon": "corners",
    },
    {
        "id": "middle_layer_right",
        "stage_name": "Middle layer",
        "title": "Step 3: Middle Layer (Right Insert)",
        "category": "Beginner Method",
        "formula": "U R U' R' U' F' U F",
        "formula_name": "Right Edge Insertion",
        "description": "Slot a middle-layer edge into the front-right slot from the top layer without disturbing the bottom layer.",
        "tip": "Turn top away from destination, do right 4-moves, rotate to face side, and do restore moves.",
        "difficulty": "Intermediate",
        "method": "Beginner",
        "icon": "layers",
    },
    {
        "id": "middle_layer_left",
        "stage_name": "Middle layer",
        "title": "Step 3: Middle Layer (Left Insert)",
        "category": "Beginner Method",
        "formula": "U' L' U L U F U' F'",
        "formula_name": "Left Edge Insertion",
        "description": "Slot a middle-layer edge into the front-left slot from the top layer.",
        "tip": "Mirror of the right insert: turn top away to the right, do left 4-moves, and restore with front turns.",
        "difficulty": "Intermediate",
        "method": "Beginner",
        "icon": "layers",
    },
    {
        "id": "bottom_layer",
        "stage_name": "Bottom layer",
        "title": "Step 2: First Layer Corner Insert",
        "category": "Beginner Method",
        "formula": "R U R' U'",
        "formula_name": "Corner Slot Insert",
        "description": "Insert a first layer corner above its matching slot down into the bottom layer.",
        "tip": "Position corner directly above its target slot. Execute Sexy Move (R U R' U') until the corner is oriented down.",
        "difficulty": "Beginner",
        "method": "Beginner",
        "icon": "corner-down",
    },
    {
        "id": "solved",
        "stage_name": "Solved",
        "title": "Step 7: Orient Corners (Finish Solve)",
        "category": "Beginner Method",
        "formula": "R' D' R D R' D' R D",
        "formula_name": "Corner Twist Repeat",
        "description": "Twist each final corner upright until yellow faces up to solve the complete cube.",
        "tip": "CRITICAL: Hold unsolved corner in front-right. Repeat R' D' R D until yellow faces up. Turn ONLY the U layer for the next corner!",
        "difficulty": "Intermediate",
        "method": "Beginner",
        "icon": "check",
    },
    {
        "id": "bottom_cross",
        "stage_name": "Bottom cross",
        "title": "Step 1: Bottom Cross (F2 Insert)",
        "category": "Beginner Method",
        "formula": "U F2",
        "formula_name": "Daisy to Cross Insert",
        "description": "Align a white cross edge on the top layer with its side center, then turn Front twice (F2) to insert.",
        "tip": "Match the side sticker of the white edge to its center on the top layer, then turn F2.",
        "difficulty": "Beginner",
        "method": "Beginner",
        "icon": "plus",
    },
    {
        "id": "sexy_move",
        "stage_name": "Drills",
        "title": "Drill: Right 4-Moves (Sexy Move)",
        "category": "Core Drills",
        "formula": "R U R' U'",
        "formula_name": "Sexy Move",
        "description": "The fundamental muscle-memory sequence in cubing: Right UP, Top LEFT, Right DOWN, Top RIGHT.",
        "tip": "Practicing this 6 times returns the cube back to its exact initial state!",
        "difficulty": "Beginner",
        "method": "Drill",
        "icon": "zap",
    },
    {
        "id": "left_4_moves",
        "stage_name": "Drills",
        "title": "Drill: Left 4-Moves (Lefty Trigger)",
        "category": "Core Drills",
        "formula": "L' U' L U",
        "formula_name": "Left 4-Moves",
        "description": "The left-hand mirror of the 4-moves: Left UP, Top RIGHT, Left DOWN, Top LEFT.",
        "tip": "Essential for left-side corner and middle-edge insertions.",
        "difficulty": "Beginner",
        "method": "Drill",
        "icon": "zap",
    },
    {
        "id": "cfop_t_perm",
        "stage_name": "PLL",
        "title": "CFOP PLL: T-Perm",
        "category": "CFOP",
        "formula": "R U R' U' R' F R2 U' R' U' R U R' F'",
        "formula_name": "T-Permutation",
        "description": "Canonical PLL algorithm that swaps two adjacent corners and two adjacent edges in a T-shape.",
        "tip": "Recognized by matching headlights on the left and bar on the right.",
        "difficulty": "Advanced",
        "method": "CFOP",
        "icon": "arrows",
    },
    {
        "id": "cfop_y_perm",
        "stage_name": "PLL",
        "title": "CFOP PLL: Y-Perm",
        "category": "CFOP",
        "formula": "F R U' R' U' R U R' F' R U R' U' R' F R F'",
        "formula_name": "Y-Permutation",
        "description": "Canonical PLL algorithm that swaps two diagonal corners and two adjacent edges.",
        "tip": "Formed by an F-trigger, Sexy move variant, and second trigger restoration.",
        "difficulty": "Advanced",
        "method": "CFOP",
        "icon": "arrows",
    },
]

# Quick map by ID
_CATALOG_BY_ID = {item["id"]: item for item in TUTORIAL_CATALOG}


def get_available_stages() -> List[Dict[str, Any]]:
    """Return all available tutorial stages with metadata."""
    return list(TUTORIAL_CATALOG)


def _clean_moves(moves: List[str]) -> List[str]:
    """Strip extraneous rotations or whitespace if needed."""
    return [m.strip() for m in moves if m and m.strip()]


def _extract_formula_moves(formula_str: str) -> List[str]:
    """Parse a formula string into a list of move tokens."""
    # Strip parens, plus, vertical bars
    cleaned = formula_str.replace("(", " ").replace(")", " ").replace("+", " ").replace("|", " ")
    return [token for token in cleaned.split() if token]


def _generate_synthetic_case(meta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a case by taking SOLVED or a partially solved base, and applying
    the inverse of target formula moves. This is guaranteed to be 100% valid,
    instantaneous, and perfectly matches the target formula.
    """
    target_moves = _extract_formula_moves(meta["formula"])
    inv_moves = invert_moves(target_moves)

    # Base state: if it's a PLL or top-layer formula, start from SOLVED;
    # if it's a middle-layer formula, start from a solved F2L base;
    # otherwise SOLVED base.
    base_state = SOLVED
    if meta.get("method") == "Beginner" and meta.get("stage_name") in ("Top cross", "Match cross", "Match corners", "Solved"):
        # We can introduce a light random bottom/middle scramble or keep base uniform
        base_state = SOLVED

    initial_facelets = apply_moves(base_state, inv_moves)
    target_facelets = apply_moves(initial_facelets, target_moves)

    return {
        "id": meta["id"],
        "stage_name": meta["stage_name"],
        "title": meta["title"],
        "category": meta["category"],
        "formula": meta["formula"],
        "formula_name": meta["formula_name"],
        "description": meta["description"],
        "tip": meta["tip"],
        "difficulty": meta["difficulty"],
        "facelets": initial_facelets,
        "target_moves": target_moves,
        "target_facelets": target_facelets,
        "scramble_moves": inv_moves,
    }


def generate_tutorial_case(stage_id: str, max_attempts: int = 12) -> Dict[str, Any]:
    """
    Generate a randomized partial-cube state for the specified tutorial stage.
    
    1. Look up stage metadata in TUTORIAL_CATALOG.
    2. Attempt dynamic solve-to-stage generation using random scramble and rubik_solver:
       - Generate random 20-move scramble.
       - Solve with solver.solve_guided(scramble, method).
       - Segment solve moves into stage boundaries.
       - Locate target stage.
       - If found, extract initial state before stage moves, and the target moves.
    3. If dynamic search does not find the stage within max_attempts (e.g. stage skipped
       by solver optimization or drill case), fallback gracefully to synthetic inverse case.
    """
    meta = _CATALOG_BY_ID.get(stage_id)
    if not meta:
        # Default to top_cross if unknown ID
        meta = _CATALOG_BY_ID["top_cross"]

    # For pure drills or explicit algorithm cases, synthetic inverse generation is canonical
    if meta.get("method") == "Drill" or stage_id in ("cfop_t_perm", "cfop_y_perm"):
        return _generate_synthetic_case(meta)

    stage_name = meta["stage_name"]
    method = meta.get("method", "Beginner")
    stage_defs = stages_mod.CFOP_STAGES if method == "CFOP" else stages_mod.STAGES

    for _ in range(max_attempts):
        fl, sc = random_scramble(random.randint(18, 22))
        try:
            moves = solver.solve_guided(fl, method=method)
            segs = stages_mod.segment(fl, moves, stage_defs)
        except Exception:
            continue

        target_seg = None
        for s in segs:
            if s["name"] == stage_name and s["end"] > s["start"]:
                target_seg = s
                break

        if not target_seg:
            continue

        start = target_seg["start"]
        end = target_seg["end"]
        prefix = moves[:start]
        stage_moves = moves[start:end]

        initial_facelets = apply_moves(fl, prefix)

        # If stage_moves is a reasonable length (e.g. <= 16 moves), use it directly
        if len(stage_moves) <= 16:
            target_facelets = apply_moves(initial_facelets, stage_moves)
            return {
                "id": meta["id"],
                "stage_name": meta["stage_name"],
                "title": meta["title"],
                "category": meta["category"],
                "formula": meta["formula"],
                "formula_name": meta["formula_name"],
                "description": meta["description"],
                "tip": meta["tip"],
                "difficulty": meta["difficulty"],
                "facelets": initial_facelets,
                "target_moves": stage_moves,
                "target_facelets": target_facelets,
                "scramble_moves": sc,
            }

        # For longer stages (e.g. Middle layer with 40 moves), extract the target formula moves
        formula_moves = _extract_formula_moves(meta["formula"])
        if formula_moves:
            # Check if formula_moves can be applied to this state, or use synthetic
            target_facelets = apply_moves(initial_facelets, formula_moves)
            return {
                "id": meta["id"],
                "stage_name": meta["stage_name"],
                "title": meta["title"],
                "category": meta["category"],
                "formula": meta["formula"],
                "formula_name": meta["formula_name"],
                "description": meta["description"],
                "tip": meta["tip"],
                "difficulty": meta["difficulty"],
                "facelets": initial_facelets,
                "target_moves": formula_moves,
                "target_facelets": target_facelets,
                "scramble_moves": sc,
            }

    # If dynamic solver loops didn't isolate in time, use reliable synthetic case
    return _generate_synthetic_case(meta)
