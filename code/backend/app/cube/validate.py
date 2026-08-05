try:
    import kociemba  # type: ignore
except Exception:
    kociemba = None

from rubik_solver import utils as rs_utils # type: ignore
from .adapters import to_kociemba, to_rubik_solver


def validate(facelets: str) -> None:
    """Raises ValueError with a human-readable message if the cube is not a
    legal, solvable state. Cheap checks first (fast, friendly message), then
    let solver be the final parity judge (it raises on illegal permutation
    / orientation, which the colour-count check can't catch)."""
    if len(facelets) != 54:
        raise ValueError(f"expected 54 stickers, got {len(facelets)}")

    for c in set(facelets):
        n = facelets.count(c)
        if n != 9:
            raise ValueError(f"colour '{c}' appears {n}x, need exactly 9")

    try:
        if kociemba:
            kociemba.solve(to_kociemba(facelets))
        else:
            rs_utils.solve(to_rubik_solver(facelets), "Beginner")
    except Exception as e:
        raise ValueError(f"cube is not solvable: {e}")
