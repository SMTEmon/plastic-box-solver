import os
import sys
import unittest.mock as mock
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
from app.cube import solver
from app.cube.constants import SOLVED
from app.vision import detect
from app.main import app
from app.db.database import Base, get_db
from app.db.models import User
from app.routers.auth import get_current_user


def test_4_1_lru_cache_on_solvers():
    # Verify cache wrappers exist and have cache_info
    assert hasattr(solver._solve_optimal_cached, "cache_info"), "_solve_optimal_cached must be wrapped with lru_cache"
    assert hasattr(solver._solve_guided_cached, "cache_info"), "_solve_guided_cached must be wrapped with lru_cache"

    solver._solve_optimal_cached.cache_clear()
    solver._solve_guided_cached.cache_clear()

    # Call solve_optimal
    res1 = solver.solve_optimal(SOLVED)
    assert isinstance(res1, list)
    info1 = solver._solve_optimal_cached.cache_info()
    assert info1.misses >= 1

    # Call solve_optimal again with the same argument
    res2 = solver.solve_optimal(SOLVED)
    assert isinstance(res2, list)
    info2 = solver._solve_optimal_cached.cache_info()
    assert info2.hits >= 1

    # Verify mutating the returned list does not corrupt cached result
    res1.append("DUMMY_MOVE")
    res3 = solver.solve_optimal(SOLVED)
    assert "DUMMY_MOVE" not in res3, "Mutating return list must not affect cache"

    # Call solve_guided
    g1 = solver.solve_guided(SOLVED)
    assert isinstance(g1, list)
    g_info1 = solver._solve_guided_cached.cache_info()
    assert g_info1.misses >= 1

    g2 = solver.solve_guided(SOLVED)
    assert isinstance(g2, list)
    g_info2 = solver._solve_guided_cached.cache_info()
    assert g_info2.hits >= 1

    g1.append("DUMMY_GUIDED")
    g3 = solver.solve_guided(SOLVED)
    assert "DUMMY_GUIDED" not in g3, "Mutating return list must not affect cache"


def test_4_2_decode_once_in_scan():
    # 1. Verify assess_quality and sample_face work with both np.ndarray and bytes
    test_img = np.full((120, 120, 3), 200, dtype=np.uint8)
    _, encoded = cv2.imencode(".png", test_img)
    raw_bytes = encoded.tobytes()

    q_bytes = detect.assess_quality(raw_bytes)
    assert "blurry" in q_bytes and "dark" in q_bytes

    q_arr = detect.assess_quality(test_img)
    assert "blurry" in q_arr and "dark" in q_arr

    # 2. Test scan endpoint with 6 valid decoded images (one per solved face)
    color_map = {
        "U": (255, 255, 255),  # White
        "R": (0, 0, 255),      # Red
        "F": (0, 255, 0),      # Green
        "D": (0, 255, 255),    # Yellow
        "L": (0, 165, 255),    # Orange
        "B": (255, 0, 0),      # Blue
    }
    encoded_faces = []
    for face in "URFDLB":
        bgr = color_map[face]
        img = np.full((120, 120, 3), bgr, dtype=np.uint8)
        _, enc = cv2.imencode(".png", img)
        encoded_faces.append(enc.tobytes())

    client = TestClient(app)
    files = [("images", (f"face_{i}.png", encoded_faces[i], "image/png")) for i in range(6)]
    res = client.post("/api/cube/scan", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "facelets" in data
    assert "faces" in data
    assert len(data["faces"]) == 6

    # 3. Test invalid image byte decode handling (HTTP 422)
    bad_files = [("images", (f"face_{i}.png", b"not_an_image", "image/png")) for i in range(6)]
    res_bad = client.post("/api/cube/scan", files=bad_files)
    assert res_bad.status_code == 422
    assert "could not decode" in res_bad.json()["detail"].lower()


def test_4_3_cubelet_preinstantiated_materials():
    cubelet_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "Components", "Cubelet.jsx")
    )
    with open(cubelet_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "const MATERIALS = {" in content, "Cubelet.jsx must define a module-level MATERIALS map"
    for col in ["white", "yellow", "red", "darkorange", "green", "blue", "black"]:
        assert f"{col}: new THREE.MeshStandardMaterial" in content, f"MATERIALS must pre-instantiate {col}"
    assert "material={materials}" in content, "Mesh must receive pre-instantiated materials array"


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal
    app.dependency_overrides.clear()


def test_4_4_integrity_error_handling(test_db):
    client = TestClient(app)

    # 1. Register a user
    res1 = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "password123", "display_name": "alice"},
    )
    assert res1.status_code == 200

    # 2. Test IntegrityError handling in auth.register by forcing db.commit to raise IntegrityError
    with mock.patch("app.routers.auth.Session.commit", side_effect=IntegrityError("stmt", "params", "orig")):
        res_conflict = client.post(
            "/api/auth/register",
            json={"email": "unique@example.com", "password": "password123", "display_name": "unique"},
        )
        assert res_conflict.status_code == 400
        assert "Email or display name already registered" in res_conflict.json()["detail"]

    # 3. Test IntegrityError handling in profile.update_profile
    db_session = test_db()
    user = db_session.query(User).filter_by(email="alice@example.com").first()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with mock.patch("app.routers.profile.Session.commit", side_effect=IntegrityError("stmt", "params", "orig")):
            res_profile = client.patch(
                "/api/profile",
                json={"display_name": "new_alice"},
            )
            assert res_profile.status_code == 400
            assert "Display name taken" in res_profile.json()["detail"]
    finally:
        del app.dependency_overrides[get_current_user]
