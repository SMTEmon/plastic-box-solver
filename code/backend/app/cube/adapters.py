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
# NaiveCube._from_color_to_facelet). Feed it anything else and it silently
# mis-parses — it doesn't error, it just search-hangs or throws deep inside
# its own solver tables (confirmed by testing).
#
# So every sticker has to be relabelled into their scheme. This used to be a
# hardcoded 3-swap cipher (w<->y, g<->r, b<->o), which is correct for a cube
# in OUR canonical orientation (U=white, F=green, R=red) and silently wrong
# for any other. A cube scanned with white on the bottom is a perfectly legal
# cube in a different orientation, and it produced a confidently wrong guided
# solution: 214 moves that left the cube neither solved nor even uniform.
#
# The fix is to derive the relabelling from the cube's OWN centres, exactly
# like to_kociemba does. Centres never move relative to each other, so they
# always identify which colour is playing which role.
_RS_FACE_COLOUR = {"U": "y", "R": "g", "F": "r", "D": "w", "L": "b", "B": "o"}


def to_rubik_solver(facelets: str) -> str:
    """rubik_solver wants COLOUR letters in ULFRBD order, in ITS OWN fixed
    colour scheme (see note above) — not our canonical one.

    Works for any orientation: the mapping is built from this cube's centres
    rather than assumed.
    """
    # our colour on each face -> the colour rubik_solver expects there
    recolour = {
        facelets[i * 9 + 4]: _RS_FACE_COLOUR[FACE_ORDER[i]] for i in range(6)
    }
    if len(recolour) != 6:
        raise ValueError("six centres must be six distinct colours")

    blocks = {FACE_ORDER[i]: facelets[i * 9:(i + 1) * 9] for i in range(6)}
    s = "".join(blocks[f] for f in "ULFRBD")
    return "".join(recolour[c.lower()] for c in s)
