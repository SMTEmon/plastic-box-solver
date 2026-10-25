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
    """Top cross oriented: middle layer done and all 4 U edge stickers match U centre."""
    uc = _centre(fl, 0)
    return middle_layer_done(fl) and all(fl[i] == uc for i in (1, 3, 5, 7))


def up_cross_matched(fl):
    """Match cross colors (JPerm Step 5 / Sune): top cross is built and the 4
    top-edge side stickers match their respective side centres under top alignment."""
    if not up_cross_done(fl):
        return False
    centres = [fl[b * 9 + 4] for b in _SIDES]
    for u_turn in ("", "U", "U2", "U'"):
        tfl = apply_move(fl, u_turn) if u_turn else fl
        edges = [tfl[i] for i in (19, 10, 46, 37)]
        if edges == centres:
            return True
    return False


_U_CORNERS = [
    (6, 18, 38),  # UFL: U, F, L
    (8, 20, 9),   # UFR: U, F, R
    (2, 47, 11),  # UBR: U, B, R
    (0, 45, 36),  # UBL: U, B, L
]


def corners_matched(fl):
    """Match corners (JPerm Step 6 / Niklas): all 4 top corners are in their
    matching 3-colour position slots (even if not yet oriented upright)."""
    if not up_cross_matched(fl):
        return False
    uc = fl[4]
    for u_turn in ("", "U", "U2", "U'"):
        tfl = apply_move(fl, u_turn) if u_turn else fl
        f_c, r_c, b_c, l_c = tfl[2 * 9 + 4], tfl[1 * 9 + 4], tfl[5 * 9 + 4], tfl[4 * 9 + 4]
        target_slots = [
            {uc, f_c, l_c},
            {uc, f_c, r_c},
            {uc, b_c, r_c},
            {uc, b_c, l_c},
        ]
        if all(
            {tfl[c[0]], tfl[c[1]], tfl[c[2]]} == slot
            for c, slot in zip(_U_CORNERS, target_slots)
        ):
            return True
    return False


def is_solved(fl):
    if len(fl) != 54:
        return False
    return fl == SOLVED or all(len(set(fl[i * 9 : (i + 1) * 9])) == 1 for i in range(6))


def oll_done(fl):
    """Orient last layer: all U-face stickers match the U centre.
    Only meaningful after F2L (i.e. middle_layer_done), which CFOP achieves
    in one combined stage rather than the beginner's two separate ones."""
    if not middle_layer_done(fl):
        return False
    uc = _centre(fl, 0)
    return all(fl[k] == uc for k in range(9))


STAGES = [
    ("Bottom cross", down_cross_done),
    ("Bottom layer", first_layer_done),
    ("Middle layer", middle_layer_done),
    ("Top cross", up_cross_done),
    ("Match cross", up_cross_matched),
    ("Match corners", corners_matched),
    ("Solved", is_solved),
]

CFOP_STAGES = [
    ("Cross", down_cross_done),
    ("F2L", middle_layer_done),
    ("OLL", oll_done),
    ("PLL", is_solved),
]


def segment(facelets: str, moves: list[str], stage_defs=None) -> list[dict]:
    """Replay `moves` from `facelets`, returning labelled stage segments:
    [{"name", "start", "end"}], where moves[start:end] complete that stage.

    `stage_defs` defaults to STAGES (beginner). Pass CFOP_STAGES for CFOP.

    A stage whose predicate never flips before the next one's does is simply
    skipped (its moves fold into the following segment), so the result stays
    contiguous no matter how the solver ordered things. Trailing corrective
    reorientations fold into the final stage so the full move list is covered.
    """
    if stage_defs is None:
        stage_defs = STAGES
    if not moves:
        return []
    state, out, cursor, si = facelets, [], 0, 0
    for i, mv in enumerate(moves):
        state = apply_move(state, mv)
        while si < len(stage_defs) and (
            stage_defs[si][1](state)
            or (si == len(stage_defs) - 1 and i == len(moves) - 1)
        ):
            out.append({"name": stage_defs[si][0], "start": cursor, "end": i + 1})
            cursor, si = i + 1, si + 1
    if out and out[-1]["end"] < len(moves):
        out[-1]["end"] = len(moves)
    return out
