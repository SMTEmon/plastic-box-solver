"""
Replay-and-segment: turn a flat guided move list into the 7 classical
beginner-method stages (build_guide.md §4.4).

We don't re-implement the beginner's method. We take the move list
solve_guided() already produces and replay it one move at a time against our
own apply_move(), cutting the list at the first index where each stage's
predicate flips true.

The predicates compare stickers against face CENTRES (never against hardcoded
colours), so they're immune to the rubik_solver colour cipher in adapters.py —
they only ask "is this face/layer built relative to its own centre?".

rubik_solver's Beginner method solves the cube BOTTOM-UP: the D (down) face
first, then middle layer, then the U (top) layer last. So each stage, once
achieved, stays true through every later stage — segmentation just walks the
predicate list in order.

Index layout (URFDLB, index = face*9 + row*3 + col):
    U 0-8   R 9-17   F 18-26   D 27-35   L 36-44   B 45-53
Centre of face block f = f*9 + 4.
"""

from .constants import SOLVED
from .moves import apply_move

# side face blocks (the four faces that ring the cube): F=2, R=1, B=5, L=4
_SIDES = (2, 1, 5, 4)


def _centre(fl, block):
    return fl[block * 9 + 4]


def _row_matches_centre(fl, block, row):
    """True if all three stickers of `row` (0=top,1=mid,2=bottom) on face
    `block` equal that face's centre colour."""
    base, ctr = block * 9 + row * 3, _centre(fl, block)
    return all(fl[base + col] == ctr for col in range(3))


def down_cross_done(fl):
    """D-face cross: the four D edge stickers match the D centre, and each
    side face's bottom-middle sticker matches its own centre."""
    dc = _centre(fl, 3)
    edges = all(fl[i] == dc for i in (28, 30, 32, 34))
    sides = all(fl[i] == _centre(fl, b) for b, i in ((2, 25), (1, 16), (5, 52), (4, 43)))
    return edges and sides


def first_layer_done(fl):
    """Whole D face solved + the bottom ring (bottom row of every side face)."""
    dc = _centre(fl, 3)
    d_face = all(fl[27 + k] == dc for k in range(9))
    ring = all(_row_matches_centre(fl, b, 2) for b in _SIDES)
    return d_face and ring


def middle_layer_done(fl):
    return first_layer_done(fl) and all(_row_matches_centre(fl, b, 1) for b in _SIDES)


def up_cross_done(fl):
    uc = _centre(fl, 0)
    return middle_layer_done(fl) and all(fl[i] == uc for i in (1, 3, 5, 7))


def up_face_done(fl):
    uc = _centre(fl, 0)
    return middle_layer_done(fl) and all(fl[k] == uc for k in range(9))


def corners_done(fl):
    """Last-layer corners positioned: the two top-row corner stickers (col 0
    and col 2) of every side face match that face's centre."""
    if not up_face_done(fl):
        return False
    return all(
        fl[b * 9 + 0] == _centre(fl, b) and fl[b * 9 + 2] == _centre(fl, b)
        for b in _SIDES
    )


def is_solved(fl):
    return fl == SOLVED


STAGES = [
    ("Bottom cross", down_cross_done),
    ("Bottom layer", first_layer_done),
    ("Middle layer", middle_layer_done),
    ("Top cross", up_cross_done),
    ("Top face", up_face_done),
    ("Position corners", corners_done),
    ("Solved", is_solved),
]

# CFOP is a different pedagogy, not just a shorter beginner's method: it does
# the first two layers TOGETHER (F2L) rather than layer by layer, and orients
# then permutes the last layer in one algorithm each. Segmenting a CFOP
# solution against the beginner list produces empty stages -- "Middle layer: 0
# moves", "Top face: 0 moves" -- because those boundaries are never crossed
# separately. These four are the real ones, built from the same predicates.
CFOP_STAGES = [
    ("Cross", down_cross_done),
    ("F2L — first two layers", middle_layer_done),
    ("OLL — orient last layer", up_face_done),
    ("PLL — permute last layer", is_solved),
]

STAGE_SETS = {
    "Beginner": STAGES,
    "CFOP": CFOP_STAGES,
}


def segment(facelets: str, moves: list[str], method: str = "Beginner") -> list[dict]:
    """Replay `moves` from `facelets`, returning labelled stage segments:
    [{"name", "start", "end"}], where moves[start:end] complete that stage.

    A stage whose predicate never flips before the next one's does is simply
    skipped (its moves fold into the following segment), so the result stays
    contiguous no matter how the solver ordered things.
    """
    table = STAGE_SETS.get(method, STAGES)
    state, out, cursor, si = facelets, [], 0, 0
    for i, mv in enumerate(moves):
        state = apply_move(state, mv)
        while si < len(table) and table[si][1](state):
            out.append({"name": table[si][0], "start": cursor, "end": i + 1})
            cursor, si = i + 1, si + 1
    return out
