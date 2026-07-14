import sys
import os

# Ensure we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.cube.moves import apply_move, GEOM, invert
from app.cube.constants import SOLVED

assert GEOM[0]["pos"] == (-1, 1, -1), GEOM[0]["pos"]
print("GEOM[0] check OK")

for f in "URFDLB":
    s = SOLVED
    for _ in range(4):
        s = apply_move(s, f)
    assert s == SOLVED, f"4x {f} failed"
print("4x any move = identity: OK")

s = SOLVED
for _ in range(6):
    for m in ["R", "U", "R'", "U'"]:
        s = apply_move(s, m)
assert s == SOLVED
print("sexy move x6 = identity: OK")

s = apply_move(SOLVED, "U")
assert s[36:39] == SOLVED[18:21], (s[36:39], SOLVED[18:21])
print("U sends F top row to L: OK")

for f in "URFDLB":
    assert apply_move(apply_move(SOLVED, f), invert(f)) == SOLVED
print("move + inverse = identity: OK")
