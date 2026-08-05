"""Integration test: guided solutions solve our model exactly, and the stage
segmentation is contiguous and covers the whole move list.

Run: ./venv/bin/python tests/test_stages.py
"""

import os
import sys
from functools import reduce

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
import random

from app.cube.moves import apply_move
from app.cube.constants import SOLVED
from app.cube.scramble import random_scramble
from app.cube.solver import solve_guided, solve_optimal
from app.cube import stages

random.seed(7)
N = 50
for t in range(N):
    facelets, _ = random_scramble(random.randint(12, 25))

    guided = solve_guided(facelets, "Beginner")
    assert reduce(apply_move, guided, facelets) == SOLVED, f"guided didn't solve @ {t}"

    optimal = solve_optimal(facelets)
    assert reduce(apply_move, optimal, facelets) == SOLVED, f"optimal didn't solve @ {t}"

    segs = stages.segment(facelets, guided)
    assert segs, f"no stages @ {t}"
    assert segs[0]["start"] == 0, f"first stage doesn't start at 0 @ {t}"
    assert segs[-1]["end"] == len(guided), f"last stage doesn't cover end @ {t}"
    for a, b in zip(segs, segs[1:]):
        assert a["end"] == b["start"], f"non-contiguous stages @ {t}"

print(f"{N} scrambles: guided + optimal solve exactly, segmentation contiguous: OK")

# solved-cube guards
assert solve_guided(SOLVED) == []
assert solve_optimal(SOLVED) == []
print("solved cube -> empty solution: OK")
