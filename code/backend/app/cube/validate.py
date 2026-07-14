import kociemba

from .adapters import to_kociemba


def validate(facelets: str) -> None:
    """Raises ValueError with a human-readable message if the cube is not a
    legal, solvable state. Cheap checks first (fast, friendly message), then
    let kociemba be the final parity judge (it raises on illegal permutation
    / orientation, which the colour-count check can't catch)."""
    if len(facelets) != 54:
        raise ValueError(f"expected 54 stickers, got {len(facelets)}")

    for c in set(facelets):
        n = facelets.count(c)
        if n != 9:
            raise ValueError(f"colour '{c}' appears {n}x, need exactly 9")

    try:
        kociemba.solve(to_kociemba(facelets))
    except Exception as e:
        raise ValueError(f"cube is not solvable: {e}")
