import kociemba
from rubik_solver import utils as rs_utils

from .adapters import to_kociemba, to_rubik_solver
from .constants import SOLVED

# rubik_solver's "Beginner" method can emit WHOLE-CUBE rotations (x, y, z —
# shown capitalised, e.g. "Y"), not just face turns. These re-orient the
# cube in your hands without turning any layer. Our apply_move() (moves.py)
# only understands face turns, so whole-cube rotations can't be replayed
# against our facelet model yet. For M1 we surface them as-is in the move
# list (a real beginner's-method app needs to show them too — "rotate the
# cube so white is on top" is a real instruction). If/when you build the
# replay-and-segment stage logic (build_guide.md §4.4), you'll need to
# either extend apply_move to handle x/y/z, or eliminate rotations by
# re-deriving each subsequent face move relative to the rotated frame.
CUBE_ROTATIONS = {"X", "Y", "Z", "X'", "Y'", "Z'", "X2", "Y2", "Z2"}


def solve_optimal(facelets: str) -> list[str]:
    """Kociemba's near-optimal (~20 move) solution. Used for BOTH Auto-Solve
    and the optimalMoveCount denominator in efficiency % (build_guide.md §1.1)."""
    if facelets == SOLVED:
        return []  # guard: kociemba's C solver doesn't reliably return ""
    moves = kociemba.solve(to_kociemba(facelets)).split()
    return moves


def solve_guided(facelets: str, method: str = "Beginner") -> list[str]:
    """method: 'Beginner' | 'CFOP' | 'Kociemba' (rubik_solver's own, not the
    kociemba package — avoid this one, only Beginner is reliable right now,
    see note below)."""
    if facelets == SOLVED:
        return []
    raw = rs_utils.solve(to_rubik_solver(facelets), method)
    return [str(m) for m in raw]


# --- What we verified while building this, keep for whoever reads this file ---
# - "Beginner" works reliably and fast (<0.1s even on a full 20-move scramble).
# - "CFOP" throws a KeyError on ordinary inputs in this package version —
#   don't expose it in the API yet.
# - Feeding rubik_solver our own (western) colour scheme instead of its
#   fixed internal one causes it to hang indefinitely on lookups instead of
#   erroring, which is much harder to debug than a clean exception. If you
#   ever see the guided endpoint hang, this colour mapping is the first
#   thing to check.
