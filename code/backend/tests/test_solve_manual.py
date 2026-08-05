import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401

from app.cube.scramble import random_scramble
from app.cube.solver import solve_optimal, solve_guided
from app.cube.validate import validate

def test_manual():
    print("Scrambling...")
    facelets, moves = random_scramble(20)
    print("Scramble moves:", moves)
    print("Scramble facelets:", facelets)
    
    validate(facelets)
    print("Validation passed!")
    
    print("Testing optimal solve...")
    optimal_moves = solve_optimal(facelets)
    print(f"Optimal moves ({len(optimal_moves)}):", optimal_moves)
    
    print("Testing beginner solve...")
    beginner_moves = solve_guided(facelets, "Beginner")
    print(f"Beginner moves ({len(beginner_moves)}):", beginner_moves[:15], "... (truncated)")

if __name__ == "__main__":
    test_manual()
