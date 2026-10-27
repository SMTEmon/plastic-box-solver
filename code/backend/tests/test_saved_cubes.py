import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.cube.constants import SOLVED
from app.db.database import Base, get_db
from app.db.models import User
from app.main import app
from app.utils.auth_utils import create_access_token, hash_password

client = TestClient(app)

# Use in-memory SQLite DB for tests with StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
import pytest

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)


# Helper to create a user and token
def get_user_token(email: str, name: str):
    db = TestingSessionLocal()
    u = db.query(User).filter(User.email == email).first()
    if not u:
        u = User(email=email, display_name=name, hashed_password=hash_password("password123"))
        db.add(u)
        db.commit()
        db.refresh(u)
    db.close()
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_access_denied():
    res = client.get("/api/cube/saved")
    assert res.status_code == 401

    res = client.post("/api/cube/saved", json={"label": "Cube 1", "facelets": SOLVED})
    assert res.status_code == 401


def test_save_and_list_cubes():
    headers = get_user_token("cubist1@test.com", "CubistOne")

    # Save a valid solved cube
    res = client.post(
        "/api/cube/saved",
        json={"label": "My Solved Cube", "facelets": SOLVED},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["label"] == "My Solved Cube"
    assert data["facelets"] == SOLVED
    cube1_id = data["id"]

    # List saved cubes
    list_res = client.get("/api/cube/saved", headers=headers)
    assert list_res.status_code == 200
    cubes = list_res.json()
    assert len(cubes) == 1
    assert cubes[0]["id"] == cube1_id


def test_reject_invalid_cube_facelets():
    headers = get_user_token("cubist1@test.com", "CubistOne")
    # All white faces is physically impossible
    invalid_facelets = "UUUUUUUUU" * 6
    res = client.post(
        "/api/cube/saved",
        json={"label": "Broken Cube", "facelets": invalid_facelets},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Invalid cube state" in res.json()["detail"]


def test_max_three_saved_cubes_limit():
    headers = get_user_token("limit_user@test.com", "LimitTester")

    # Add 3 valid cubes
    for i in range(1, 4):
        res = client.post(
            "/api/cube/saved",
            json={"label": f"Slot {i}", "facelets": SOLVED},
            headers=headers,
        )
        assert res.status_code == 200

    # 4th cube attempt must fail with 400
    res4 = client.post(
        "/api/cube/saved",
        json={"label": "Slot 4", "facelets": SOLVED},
        headers=headers,
    )
    assert res4.status_code == 400
    assert "Maximum limit of 3" in res4.json()["detail"]


def test_delete_saved_cube():
    headers = get_user_token("deleter@test.com", "DeleterUser")

    # Create cube
    res = client.post(
        "/api/cube/saved",
        json={"label": "To Delete", "facelets": SOLVED},
        headers=headers,
    )
    assert res.status_code == 200
    cube_id = res.json()["id"]

    # Delete cube
    del_res = client.delete(f"/api/cube/saved/{cube_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm it's gone
    list_res = client.get("/api/cube/saved", headers=headers)
    assert len(list_res.json()) == 0


def test_cannot_delete_other_users_cube():
    user1_headers = get_user_token("user_a@test.com", "UserA")
    user2_headers = get_user_token("user_b@test.com", "UserB")

    # User A creates a cube
    res = client.post(
        "/api/cube/saved",
        json={"label": "User A Cube", "facelets": SOLVED},
        headers=user1_headers,
    )
    assert res.status_code == 200
    cube_id = res.json()["id"]

    # User B attempts to delete User A's cube
    del_res = client.delete(f"/api/cube/saved/{cube_id}", headers=user2_headers)
    assert del_res.status_code == 404
