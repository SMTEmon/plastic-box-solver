try:
    import kociemba  # type: ignore
except Exception:
    kociemba = None

from rubik_solver import utils as rs_utils # type: ignore
from .adapters import to_kociemba, to_rubik_solver
from .constants import COLOURS
from .moves import apply_moves, get_centre_restore_moves


def validate(facelets: str) -> None:
    """Raises ValueError with a human-readable message if the cube is not a
    legal, solvable state. Cheap checks first (fast, friendly message), then
    let solver be the final parity judge (it raises on illegal permutation
    / orientation, which the colour-count check can't catch)."""
    if len(facelets) != 54:
        raise ValueError(f"expected 54 stickers, got {len(facelets)}")

    if set(facelets) != set(COLOURS):
        raise ValueError(f"cube facelets must contain only colours '{COLOURS}'")

    for c in set(facelets):
        n = facelets.count(c)
        if n != 9:
            raise ValueError(f"colour '{c}' appears {n}x, need exactly 9")

    restore_moves = get_centre_restore_moves(facelets)
    if restore_moves is None:
        centres = "".join(facelets[i * 9 + 4] for i in range(6))
        raise ValueError(
            f"centres '{centres}' must be a valid 3D orientation of 'wrgyob'"
        )

    canonical = apply_moves(facelets, restore_moves) if restore_moves else facelets

    try:
        if kociemba:
            kociemba.solve(to_kociemba(canonical))
        else:
            rs_utils.solve(to_rubik_solver(canonical), "Beginner")
    except Exception as e:
        raise ValueError(f"cube is not solvable: {e}")

