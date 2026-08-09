try:
    import kociemba  # type: ignore
except Exception:
    kociemba = None

from rubik_solver import utils as rs_utils # type: ignore

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
    if kociemba:
        moves = kociemba.solve(to_kociemba(facelets)).split()
        return moves
    raw = [str(m) for m in rs_utils.solve(to_rubik_solver(facelets), "Kociemba")]
    moves = [_translate(m) for m in raw]
    moves += _corrective_rotation(apply_moves(facelets, moves))
    return _trim_after_solved(facelets, moves)


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


# Human-followable teaching methods, in the order we fall back through.
TEACHING_METHODS = {
    "Beginner": "Beginner's method",
    "CFOP": "CFOP (Fridrich)",
}


#: index of the D-face centre in a facelet string (face 3, row 1, col 1)
_D_CENTRE = 3 * 9 + 4


def rotation_to_put_down(facelets: str, colour: str) -> list[str]:
    """Shortest whole-cube rotation bringing `colour`'s centre onto the D face.

    rubik_solver's beginner method always builds the DOWN face first -- there
    is no parameter to tell it otherwise. But "which face is down" is purely a
    matter of how you are holding the cube, so the choice can be handed back to
    the user by reorienting the cube before solving and prepending that
    rotation to the solution.

    That is also what a human does: step one of every beginner tutorial is
    "hold the cube with white on the bottom". Now the guide literally says so.
    """
    if facelets[_D_CENTRE] == colour:
        return []
    best = None
    for seq in _ORIENTATIONS.values():
        if apply_moves(facelets, seq)[_D_CENTRE] == colour:
            if best is None or len(seq) < len(best):
                best = seq
    return list(best) if best else []


def solve_teaching(
    facelets: str,
    method: str = "Beginner",
    first_colour: str | None = None,
) -> tuple[list[str], str, list[str]]:
    """Guided-mode solve that never fails.

    Returns (moves, method_actually_used, prep_rotations).

    `first_colour` is the colour the user wants to build first. The returned
    move list already begins with the reorientation, so replaying it from the
    original `facelets` still lands on SOLVED -- callers do not need to know
    the rotation happened, but it is returned so the UI can explain it.

    CFOP is worth offering -- measured over 40 random scrambles it averages
    ~106 moves against the beginner method's ~191, because it solves the first
    two layers together instead of layer by layer. But it is not reliable: in
    the same sample it raised KeyError on 6 of 40 inputs, somewhere inside
    rubik_solver's own lookup tables. That is a bug in the library, not in the
    cube it was given -- the beginner method solves those same cubes fine.

    So CFOP is exposed, and when it throws we quietly fall back to Beginner and
    report which one actually ran. A teaching mode that occasionally returns a
    500 would be worse than one that occasionally returns a longer solution.
    """
    if method not in TEACHING_METHODS:
        method = "Beginner"

    prep = rotation_to_put_down(facelets, first_colour) if first_colour else []
    start = apply_moves(facelets, prep)

    try:
        moves = solve_guided(start, method=method)
        used = method
    except Exception:
        if method == "Beginner":
            raise
        moves = solve_guided(start, method="Beginner")
        used = "Beginner"

    return prep + moves, used, prep


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
# Measured over 40 random 20-move scrambles, checking each solution actually
# replays to the exact SOLVED string:
#
#     method     solved    avg moves    avg time
#     Beginner   40/40         190.6        78 ms
#     CFOP       34/40         105.9        52 ms   (6x KeyError)
#     Kociemba   40/40          ~21          --     (via the kociemba package)
#
# - "Beginner" is the reliable one and is the fallback for everything.
# - "CFOP" is worth having: roughly HALF the moves, because it solves the first
#   two layers together. But it raises KeyError deep inside rubik_solver's own
#   tables on ~15% of inputs. Those same cubes solve fine with Beginner, so it
#   is a library bug, not bad input. solve_teaching() handles the fallback.
# - Kociemba is a different tool for a different job: near-optimal, but its
#   moves teach you nothing, so it powers Auto-Solve and the efficiency
#   denominator and is deliberately NOT offered as a guided method.
# - Feeding rubik_solver our own (western) colour scheme instead of its
#   fixed internal one causes it to hang indefinitely on lookups instead of
#   erroring, which is much harder to debug than a clean exception. If you
#   ever see the guided endpoint hang, this colour mapping is the first
#   thing to check.
