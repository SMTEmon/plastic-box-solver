"""
Why canonical facelets are COLOUR letters, not face letters (see build_guide §4.2):
each solver library wants a different alphabet/order, and colour letters let both
adapters be two lines instead of one being a two-line map and the other an inverse map.
"""

from .constants import FACE_ORDER   # "URFDLB"


def to_kociemba(facelets: str) -> str:
    """kociemba wants FACE letters (U R F D L B) in URFDLB order."""
    centres = {facelets[i * 9 + 4]: FACE_ORDER[i] for i in range(6)}
    if len(centres) != 6:
        raise ValueError("six centres must be six distinct colours")
    return "".join(centres[c] for c in facelets)


# rubik_solver hardcodes its OWN fixed colour scheme internally: it assumes
# D=white, U=yellow, R=green, F=red, B=orange, L=blue when solved (see its
# NaiveCube._from_color_to_facelet). Our canonical scheme (constants.py) is
# the standard western one: U=white, D=yellow, F=green, B=blue, L=orange,
# R=red. Feed it our colours directly and it silently mis-parses the cube —
# it doesn't error, it just search-hangs or throws deep inside its own
# solver tables (confirmed by testing). This 3-swap substitution cipher
# relabels our colours into theirs. It's a pure recolouring (not a spatial
# rotation), so it's valid for any facelet string, not just the solved one.
_RUBIK_SOLVER_COLOUR_FIX = {"w": "y", "y": "w", "g": "r", "r": "g", "b": "o", "o": "b"}


def to_rubik_solver(facelets: str) -> str:
    """rubik_solver wants COLOUR letters in ULFRBD order, in ITS OWN fixed
    colour scheme (see note above) — not our canonical one."""
    blocks = {FACE_ORDER[i]: facelets[i * 9:(i + 1) * 9] for i in range(6)}
    s = "".join(blocks[f] for f in "ULFRBD")
    return "".join(_RUBIK_SOLVER_COLOUR_FIX[c] for c in s)
