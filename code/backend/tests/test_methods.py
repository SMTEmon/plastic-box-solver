"""Teaching methods: Beginner vs CFOP, and the fallback between them.

Run: ./venv/bin/python tests/test_methods.py
"""

import os
import random
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401

from app.cube import solver, stages as stages_mod
from app.cube.constants import SOLVED
from app.cube.moves import apply_move, apply_moves
from app.cube.scramble import random_scramble

TRIALS = 25
random.seed(7)

stats = {"Beginner": [], "CFOP": []}
fallbacks = 0
cfop_raw_failures = 0

for _ in range(TRIALS):
    facelets, _scramble = random_scramble(20)

    # --- the guided path must never fail, whichever method is asked for ---
    for requested in ("Beginner", "CFOP"):
        t0 = time.time()
        moves, used, _p = solver.solve_teaching(facelets, method=requested)
        elapsed = time.time() - t0

        assert apply_moves(facelets, moves) == SOLVED, (
            f"{requested} (ran as {used}) did not solve the cube"
        )
        assert elapsed < 10, f"{used} took {elapsed:.1f}s, far too slow"

        if used != requested:
            fallbacks += 1
        stats[used].append(len(moves))

        # --- stage segmentation must be contiguous and cover everything ---
        segments = stages_mod.segment(facelets, moves, method=used)
        assert segments, f"{used} produced no stage segments"
        assert segments[0]["start"] == 0
        assert segments[-1]["end"] == len(moves)
        cursor = 0
        for seg in segments:
            assert seg["start"] == cursor, "stages must be contiguous"
            assert seg["end"] > seg["start"] or seg["end"] == seg["start"]
            cursor = seg["end"]

        # --- and use the right vocabulary for that method ---
        names = {s["name"] for s in segments}
        expected = {n for n, _ in stages_mod.STAGE_SETS[used]}
        assert names <= expected, f"{used} emitted unknown stages: {names - expected}"

    # --- how often does raw CFOP actually fail? ---
    try:
        solver.solve_guided(facelets, method="CFOP")
    except Exception:
        cfop_raw_failures += 1

print(f"solve_teaching never failed across {TRIALS * 2} calls: OK")
print(f"stage segmentation contiguous + correctly labelled: OK")

avg = {m: (sum(v) / len(v) if v else 0) for m, v in stats.items()}
print(f"average solution length -> Beginner {avg['Beginner']:.0f} moves, "
      f"CFOP {avg['CFOP']:.0f} moves")

# The whole reason CFOP is offered. If this ever stops holding, the extra
# option is not earning its place.
assert avg["CFOP"] < avg["Beginner"], "CFOP should be shorter than Beginner"
print("CFOP is meaningfully shorter than the beginner method: OK")

rate = cfop_raw_failures / TRIALS * 100
print(f"raw CFOP raised on {cfop_raw_failures}/{TRIALS} cubes ({rate:.0f}%) — "
      f"handled by falling back to Beginner ({fallbacks} fallbacks)")

# CFOP stages are the four real ones, not the seven beginner ones.
assert [n for n, _ in stages_mod.STAGE_SETS["CFOP"]] == [
    "Cross",
    "F2L — first two layers",
    "OLL — orient last layer",
    "PLL — permute last layer",
]
assert len(stages_mod.STAGE_SETS["Beginner"]) == 7
print("CFOP uses its own 4-stage vocabulary, Beginner keeps its 7: OK")

# An unknown method name must not explode -- it degrades to Beginner.
moves, used, prep = solver.solve_teaching(random_scramble(20)[0], method="nonsense")
assert used == "Beginner", used
assert prep == []
print("unknown method degrades to Beginner: OK")

# --- the user picks which colour to build first -----------------------------
# Teaching methods always solve the D face, so the choice is implemented by
# rotating the cube first and prepending that rotation. Verify the chosen
# colour really is the one that gets built.
D_CENTRE = 3 * 9 + 4
for colour in "wyrogb":
    facelets, _ = random_scramble(20)
    for method in ("Beginner", "CFOP"):
        moves, used, prep = solver.solve_teaching(
            facelets, method=method, first_colour=colour
        )
        assert apply_moves(facelets, moves) == SOLVED, (
            f"{method}/{colour}: prepending the rotation broke the solution"
        )
        segments = stages_mod.segment(facelets, moves, method=used)
        state = facelets
        for mv in moves[: segments[0]["end"]]:
            state = apply_move(state, mv)
        assert state[D_CENTRE] == colour, (
            f"{method}/{colour}: built {state[D_CENTRE]} first instead"
        )
print("all 6 starting colours x 2 methods build the chosen face first: OK")

# --- and the bug that fix exposed -------------------------------------------
# A cube scanned with white on the bottom is legal, just differently oriented.
# to_rubik_solver used to assume our canonical orientation and silently
# produced a wrong solution for anything else.
facelets, _ = random_scramble(20)
for label, rotation in (
    ("as scanned", []),
    ("white down", ["X2"]),
    ("green up", ["Z'"]),
    ("blue front", ["Y2"]),
):
    cube = apply_moves(facelets, rotation)
    moves, used, _prep = solver.solve_teaching(cube, method="Beginner")
    assert apply_moves(cube, moves) == SOLVED, (
        f"guided solve is wrong for a cube oriented '{label}'"
    )
print("guided mode works for any cube orientation, not just canonical: OK")

print("ALL METHOD TESTS OK")
