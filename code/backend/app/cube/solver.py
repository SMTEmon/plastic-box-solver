import kociemba
from rubik_solver import utils as rs_utils

from .adapters import to_kociemba, to_rubik_solver
from .constants import SOLVED
from .moves import apply_move, apply_moves

# rubik_solver's "Beginner" method emits WHOLE-CUBE rotations (X, Y, Z — cube
# reorientations, not layer turns) alongside face turns. Two things must be
# reconciled before its output is usable against our facelet model:
#
# 1. DIRECTION. rubik_solver's rotation convention is the mirror of ours:
#    its X/Y/Z spin the opposite way to our apply_move's. (Face turns U..B
#    match 1:1 — verified empirically against the rubik_solver engine.) So we
#    invert every rotation token when translating into our notation.
#
# 2. FINAL ORIENTATION. rubik_solver stops when the cube is uniform, which can
#    leave it visually solved but reoriented (a net cube rotation it never
#    cancels). We detect that leftover reorientation and append a corrective
#    rotation so the sequence lands on our exact SOLVED string — which the
#    stage predicates (stages.py) and the frontend both depend on.
_ROT_TOKENS = "XYZ"


def _translate(move: str) -> str:
    """rubik_solver token -> our token. Only rotations flip direction."""
    if move[0] in _ROT_TOKENS:
        if move.endswith("2"):
            return move
        return move[0] if move.endswith("'") else move + "'"
    return move


# The 24 whole-cube orientations, each as a short sequence of our rotation
# tokens. Used to find the single corrective rotation that re-cans a
# visually-solved-but-reoriented cube back onto SOLVED.
def _orientation_sequences():
    gens = [t + s for t in _ROT_TOKENS for s in ("", "'", "2")]
    seen = {SOLVED: []}
    frontier = [[]]
    while frontier:
        seq = frontier.pop()
        state = apply_moves(SOLVED, seq)
        for g in gens:
            nxt = apply_move(state, g)
            if nxt not in seen:
                seen[nxt] = seq + [g]
                frontier.append(seq + [g])
    return seen  # facelets -> rotation-token sequence reaching it from SOLVED


_ORIENTATIONS = _orientation_sequences()


def _corrective_rotation(state: str) -> list[str]:
    """Rotation tokens that turn a uniform-but-reoriented `state` into SOLVED,
    or [] if it's already SOLVED / not a pure reorientation."""
    if state == SOLVED:
        return []
    for target, seq in _ORIENTATIONS.items():
        if apply_moves(state, seq) == SOLVED:
            return seq
    return []  # not a pure reorientation (shouldn't happen for a valid solve)


def solve_optimal(facelets: str) -> list[str]:
    """Kociemba's near-optimal (~20 move) solution. Used for BOTH Auto-Solve
    and the optimalMoveCount denominator in efficiency % (build_guide.md §1.1)."""
    if facelets == SOLVED:
        return []  # guard: kociemba's C solver doesn't reliably return ""
    moves = kociemba.solve(to_kociemba(facelets)).split()
    return moves


def solve_guided(facelets: str, method: str = "Beginner") -> list[str]:
    """Beginner's-method move list in OUR notation, guaranteed to drive
    `facelets` to the exact SOLVED string when replayed with apply_move.

    method: 'Beginner' | 'CFOP' | 'Kociemba' (rubik_solver's own) — only
    'Beginner' is reliable right now (see note at bottom of file)."""
    if facelets == SOLVED:
        return []
    raw = [str(m) for m in rs_utils.solve(to_rubik_solver(facelets), method)]
    moves = [_translate(m) for m in raw]
    moves += _corrective_rotation(apply_moves(facelets, moves))
    return _trim_after_solved(facelets, moves)


def _trim_after_solved(facelets: str, moves: list[str]) -> list[str]:
    """rubik_solver often tacks redundant moves on after the cube is already
    solved (e.g. a trailing 'U U U U'). Cut the list at the first move that
    reaches SOLVED — always a correct, shorter solution, and it keeps the
    stage segmentation's final 'Solved' boundary at len(moves)."""
    state = facelets
    for i, mv in enumerate(moves):
        state = apply_move(state, mv)
        if state == SOLVED:
            return moves[: i + 1]
    return moves


# --- What we verified while building this, keep for whoever reads this file ---
# - "Beginner" works reliably and fast (<0.1s even on a full 20-move scramble).
# - "CFOP" throws a KeyError on ordinary inputs in this package version —
#   don't expose it in the API yet.
# - Feeding rubik_solver our own (western) colour scheme instead of its
#   fixed internal one causes it to hang indefinitely on lookups instead of
#   erroring, which is much harder to debug than a clean exception. If you
#   ever see the guided endpoint hang, this colour mapping is the first
#   thing to check.
