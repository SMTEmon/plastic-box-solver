"""
IMPORTANT THEORY NOTE — read before touching this file.

You CANNOT generate a random cube by shuffling the 54 characters randomly.
A Rubik's cube has strict parity constraints:
  - corner orientation sum must be 0 mod 3
  - edge orientation sum must be 0 mod 2
  - overall permutation parity must be even
Only 1 in 12 of all naive 54-char arrangements (with correct colour counts)
is actually a legal, solvable state. If you shuffle randomly, ~92% of the
"cubes" you generate will make kociemba/rubik_solver throw immediately.

The correct way to "randomly generate a cube": start from SOLVED and apply a
sequence of random legal face turns. Every reachable state via legal moves
is, by definition, solvable — because the scramble itself is a sequence of
moves whose inverse solves it.
"""

import random

from .constants import SOLVED
from .moves import apply_move

MOVES = [f + s for f in "URFDLB" for s in ("", "'", "2")]


def random_scramble(n_moves: int = 20) -> tuple[str, list[str]]:
    """Returns (facelets, moves_applied). Avoids immediately cancelling moves
    (e.g. R then R') so the scramble doesn't waste turns undoing itself."""
    moves: list[str] = []
    last_face = None
    state = SOLVED

    while len(moves) < n_moves:
        move = random.choice(MOVES)
        face = move[0]
        if face == last_face:
            continue  # avoid R R2 R' etc. on the same face back-to-back
        moves.append(move)
        last_face = face
        state = apply_move(state, move)

    return state, moves
