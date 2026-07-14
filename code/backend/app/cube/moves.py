"""
Python port of frontend/src/cube/geometry.js + moves.js.

We do NOT hand-write six 54-entry permutation tables. We generate them from
3D geometry, same as the frontend, so the backend and frontend can never
silently disagree on what "R" means. This is what makes scramble.py able to
produce a GUARANTEED SOLVABLE cube (see scramble.py docstring).
"""

from itertools import product

FACES = "URFDLB"

# normal vector, and how (row, col) maps into 3D slot position, per face
_LAYOUT = {
    "U": {"n": (0, 1, 0),  "pos": lambda r, c: (c - 1,  1,      r - 1)},
    "R": {"n": (1, 0, 0),  "pos": lambda r, c: (1,      1 - r,  1 - c)},
    "F": {"n": (0, 0, 1),  "pos": lambda r, c: (c - 1,  1 - r,  1)},
    "D": {"n": (0, -1, 0), "pos": lambda r, c: (c - 1, -1,      1 - r)},
    "L": {"n": (-1, 0, 0), "pos": lambda r, c: (-1,     1 - r,  c - 1)},
    "B": {"n": (0, 0, -1), "pos": lambda r, c: (1 - c,  1 - r, -1)},
}

# GEOM[i] = {"pos": (x,y,z), "normal": (nx,ny,nz)}  for i in 0..53
GEOM = []
for f in FACES:
    for r, c in product(range(3), range(3)):
        GEOM.append({"pos": _LAYOUT[f]["pos"](r, c), "normal": _LAYOUT[f]["n"]})


def _key(pos, normal):
    return (tuple(pos), tuple(normal))


INDEX_OF = {_key(g["pos"], g["normal"]): i for i, g in enumerate(GEOM)}

_AXIS = {"U": 1, "D": 1, "R": 0, "L": 0, "F": 2, "B": 2}   # 0=x 1=y 2=z
_LAYER = {"U": 1, "D": -1, "R": 1, "L": -1, "F": 1, "B": -1}


def _rot90(v, axis, direction):
    x, y, z = v
    if axis == 0:
        return (x, -direction * z, direction * y)
    if axis == 1:
        return (direction * z, y, -direction * x)
    return (-direction * y, direction * x, z)


def _build_permutation(face):
    """perm[new_index] = old_index"""
    axis, layer = _AXIS[face], _LAYER[face]
    direction = -layer
    perm = list(range(54))
    for i, g in enumerate(GEOM):
        if g["pos"][axis] != layer:
            continue
        j = INDEX_OF[_key(_rot90(g["pos"], axis, direction), _rot90(g["normal"], axis, direction))]
        perm[j] = i
    return perm


PERMS = {f: _build_permutation(f) for f in FACES}


def apply_move(facelets: str, move: str) -> str:
    """move like 'R', "R'", 'R2'."""
    face = move[0]
    times = 2 if move.endswith("2") else 3 if move.endswith("'") else 1
    out = facelets
    for _ in range(times):
        out = "".join(out[src] for src in PERMS[face])
    return out


def apply_moves(facelets: str, moves: list[str]) -> str:
    state = facelets
    for m in moves:
        state = apply_move(state, m)
    return state


def invert(move: str) -> str:
    if move.endswith("2"):
        return move
    if move.endswith("'"):
        return move[0]
    return move + "'"
