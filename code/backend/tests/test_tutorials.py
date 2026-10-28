"""
Test tutorial endpoints and dynamic case generator.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import _compat_imp_shim
from app.cube.tutorials import get_available_stages, generate_tutorial_case
from app.cube.moves import apply_moves
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_tutorial_stages():
    response = client.get("/api/cube/tutorial/stages")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    ids = [item["id"] for item in data]
    assert "top_cross" in ids
    assert "match_cross" in ids
    assert "match_corners" in ids
    assert "middle_layer_right" in ids
    print("test_get_tutorial_stages: OK")


def test_generate_tutorial_case_top_cross():
    response = client.post("/api/cube/tutorial/generate", json={"stage_id": "top_cross"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "top_cross"
    assert len(data["facelets"]) == 54
    assert len(data["target_facelets"]) == 54
    assert data["target_moves"] == ["F", "R", "U", "R'", "U'", "F'"]
    assert not any(m[0] in "XYZ" for m in data["target_moves"])
    # Applying target_moves from initial facelets should produce target_facelets
    result = apply_moves(data["facelets"], data["target_moves"])
    assert result == data["target_facelets"]
    print("test_generate_tutorial_case_top_cross: OK")


def test_generate_tutorial_case_sune():
    response = client.post("/api/cube/tutorial/generate", json={"stage_id": "match_cross"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "match_cross"
    result = apply_moves(data["facelets"], data["target_moves"])
    assert result == data["target_facelets"]
    print("test_generate_tutorial_case_sune: OK")


def test_generate_tutorial_case_drill():
    response = client.post("/api/cube/tutorial/generate", json={"stage_id": "sexy_move"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "sexy_move"
    assert data["target_moves"] == ["R", "U", "R'", "U'"]
    result = apply_moves(data["facelets"], data["target_moves"])
    assert result == data["target_facelets"]
    print("test_generate_tutorial_case_drill: OK")


if __name__ == "__main__":
    test_get_tutorial_stages()
    test_generate_tutorial_case_top_cross()
    test_generate_tutorial_case_sune()
    test_generate_tutorial_case_drill()
    print("ALL TUTORIAL BACKEND TESTS PASSED!")
