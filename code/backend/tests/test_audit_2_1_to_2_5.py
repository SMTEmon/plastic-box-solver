import os
import sys
import io
import cv2
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.db.models import User
from app.cube.constants import SOLVED
from app.cube.scramble import random_scramble
from app.cube.moves import apply_move, invert
from app.vision.detect import _decode
from app.main import app
import app.utils.auth_utils as auth_utils


# Set up test database with StaticPool so all connections share the same in-memory DB
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_2_1_create_solve_validation_and_derivation():
    db = TestingSession()
    user = User(email="solver@example.com", display_name="Solver", hashed_password="pw")
    db.add(user)
    db.commit()
    user_id = user.id
    db.close()

    token = auth_utils.create_access_token({"sub": "solver@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Scramble is already SOLVED -> reject 400
    res = client.post(
        "/api/solves",
        headers=headers,
        json={
            "solve_time": 12.5,
            "move_count": 10,
            "optimal_moves": 10,
            "scramble": SOLVED,
            "solution": "R U R' U'",
        },
    )
    assert res.status_code == 400, f"Expected 400 for already-solved scramble, got {res.status_code}"

    # 2. Scramble is valid, but solution does NOT solve it -> reject 400
    scramble_state = apply_move(SOLVED, "R")
    res = client.post(
        "/api/solves",
        headers=headers,
        json={
            "solve_time": 15.0,
            "move_count": 5,
            "optimal_moves": 1,
            "scramble": scramble_state,
            "solution": "U",  # Wrong move
        },
    )
    assert res.status_code == 400, f"Expected 400 for wrong solution, got {res.status_code}"

    # 3. Valid scramble and solution:
    # Scramble: R, Solution: R'
    # Server should derive move_count=1 and optimal_moves=1 (from solve_optimal)
    res = client.post(
        "/api/solves",
        headers=headers,
        json={
            "solve_time": 8.0,
            "move_count": 999,  # Bogus client count
            "optimal_moves": 999,  # Bogus client count
            "scramble": scramble_state,
            "solution": "R'",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["move_count"] == 1, f"Expected server-derived move_count=1, got {data['move_count']}"
    assert data["optimal_moves"] == 1, f"Expected server-derived optimal_moves=1, got {data['optimal_moves']}"
    assert data["efficiency"] == 100.0, f"Expected 100% efficiency, got {data['efficiency']}"
    print("test_2_1_create_solve_validation_and_derivation: OK")


def test_2_2_secret_key_and_docker_compose():
    # auth_utils.SECRET_KEY is non-empty and has high entropy
    assert auth_utils.SECRET_KEY, "SECRET_KEY must be populated"
    assert len(auth_utils.SECRET_KEY) >= 32, "SECRET_KEY fallback must have at least 32 chars"

    # docker-compose.yml checks
    compose_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docker-compose.yml"))
    with open(compose_path, "r") as f:
        compose_content = f.read()

    assert "127.0.0.1:5433:5432" in compose_content, "docker-compose.yml must bind postgres to 127.0.0.1:5433:5432"
    assert "${SECRET_KEY:-" in compose_content, "docker-compose.yml must use ${SECRET_KEY:-...} substitution"
    print("test_2_2_secret_key_and_docker_compose: OK")


def test_2_3_scan_size_limit_and_image_decode_resize():
    # 1. Upload > 5MB to /api/cube/scan -> HTTP 413
    oversized = b"X" * (5 * 1024 * 1024 + 10)
    normal = b"small"
    files = [
        ("images", ("f1.jpg", io.BytesIO(oversized), "image/jpeg")),
        ("images", ("f2.jpg", io.BytesIO(normal), "image/jpeg")),
        ("images", ("f3.jpg", io.BytesIO(normal), "image/jpeg")),
        ("images", ("f4.jpg", io.BytesIO(normal), "image/jpeg")),
        ("images", ("f5.jpg", io.BytesIO(normal), "image/jpeg")),
        ("images", ("f6.jpg", io.BytesIO(normal), "image/jpeg")),
    ]
    res = client.post("/api/cube/scan", files=files)
    assert res.status_code == 413, f"Expected 413 for >5MB image, got {res.status_code}"

    # 2. _decode resizing: create a large 3000x2000 synthetic image
    large_img = np.zeros((2000, 3000, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", large_img)
    decoded = _decode(buf.tobytes())
    assert decoded.shape[0] <= 2048 and decoded.shape[1] <= 2048, f"Decoded shape {decoded.shape} exceeds 2048"

    print("test_2_3_scan_size_limit_and_image_decode_resize: OK")


def test_2_4_scramble_bounds():
    # Query ge=1, le=100
    # ge=1 violated:
    res = client.post("/api/cube/scramble?n_moves=0")
    assert res.status_code == 422, f"Expected 422 for n_moves=0, got {res.status_code}"

    # le=100 violated:
    res = client.post("/api/cube/scramble?n_moves=101")
    assert res.status_code == 422, f"Expected 422 for n_moves=101, got {res.status_code}"

    # Valid:
    res = client.post("/api/cube/scramble?n_moves=25")
    assert res.status_code == 200
    assert len(res.json()["moves"]) == 25

    print("test_2_4_scramble_bounds: OK")


def test_2_5_password_max_length_and_email_normalization():
    # 1. Password > 72 chars -> 422
    long_pw = "a" * 73
    res = client.post(
        "/api/auth/register",
        json={"email": "norm@example.com", "password": long_pw},
    )
    assert res.status_code == 422, f"Expected 422 for password > 72 chars, got {res.status_code}"

    # 2. Register with uppercase / padded email
    res = client.post(
        "/api/auth/register",
        json={"email": "  NormUser@EXAMPLE.COM  ", "password": "securepassword123"},
    )
    assert res.status_code == 200, f"Registration failed: {res.text}"
    reg_data = res.json()
    assert reg_data["email"] == "normuser@example.com", f"Email not normalized: {reg_data['email']}"

    # 3. Login with lowercase unpadded email
    res = client.post(
        "/api/auth/login",
        data={"username": "normuser@example.com", "password": "securepassword123"},
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    assert token, "Token not returned"

    # 4. Login with mixed case and whitespace
    res = client.post(
        "/api/auth/login",
        data={"username": "  NORMUSER@example.com  ", "password": "securepassword123"},
    )
    assert res.status_code == 200, f"Login with mixed-case email failed: {res.text}"

    print("test_2_5_password_max_length_and_email_normalization: OK")


if __name__ == "__main__":
    test_2_1_create_solve_validation_and_derivation()
    test_2_2_secret_key_and_docker_compose()
    test_2_3_scan_size_limit_and_image_decode_resize()
    test_2_4_scramble_bounds()
    test_2_5_password_max_length_and_email_normalization()
    print("ALL AUDIT 2.1 - 2.5 TESTS PASSED!")
