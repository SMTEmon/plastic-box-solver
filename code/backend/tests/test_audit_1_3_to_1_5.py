import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import Solve, User
from app.routers.leaderboard import leaderboard
from app.routers.solves import history
from app.main import app, lifespan


def test_models_indexes():
    # 1.4: user_id, solve_time, created_at on Solve must have index=True
    solve_cols = Solve.__table__.columns
    assert solve_cols["user_id"].index is True, "Solve.user_id must have index=True"
    assert solve_cols["solve_time"].index is True, "Solve.solve_time must have index=True"
    assert solve_cols["created_at"].index is True, "Solve.created_at must have index=True"
    print("test_models_indexes: OK")


def test_leaderboard_and_solves_tie_breaking_and_pagination():
    engine = create_engine("sqlite:///:memory:")
    TestingSession = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()

    try:
        # Create users
        u1 = User(id=1, email="user1@example.com", display_name="UserOne", hashed_password="pw")
        u2 = User(id=2, email="user2@example.com", display_name="UserTwo", hashed_password="pw")
        db.add_all([u1, u2])
        db.commit()

        # Add solves for User 1:
        # Solve 1A: 10.0s, 70% efficiency
        # Solve 1B: 10.0s, 90% efficiency (should be User 1's best)
        # Solve 1C: 15.0s, 95% efficiency
        s1a = Solve(user_id=1, solve_time=10.0, move_count=50, optimal_moves=35, efficiency=70.0, created_at=datetime(2026, 1, 1))
        s1b = Solve(user_id=1, solve_time=10.0, move_count=40, optimal_moves=36, efficiency=90.0, created_at=datetime(2026, 1, 2))
        s1c = Solve(user_id=1, solve_time=15.0, move_count=30, optimal_moves=28, efficiency=95.0, created_at=datetime(2026, 1, 3))

        # Add solve for User 2:
        # Solve 2A: 10.0s, 80% efficiency (between 1A and 1B)
        s2a = Solve(user_id=2, solve_time=10.0, move_count=45, optimal_moves=36, efficiency=80.0, created_at=datetime(2026, 1, 1))

        db.add_all([s1a, s1b, s1c, s2a])
        db.commit()

        # 1.3: Leaderboard should choose s1b (90% eff) for User 1, and s2a (80% eff) for User 2.
        # User 1 should be rank 1 (10.0s, 90%), User 2 should be rank 2 (10.0s, 80%).
        lb = leaderboard(db=db, me=u1)
        assert len(lb) == 2, f"Expected 2 leaderboard entries, got {len(lb)}"
        assert lb[0].user_id == 1, f"Expected User 1 to be rank 1, got {lb[0].user_id}"
        assert lb[0].efficiency == 90.0, f"Expected 90.0 efficiency for User 1 PB, got {lb[0].efficiency}"
        assert lb[0].is_me is True
        assert lb[1].user_id == 2, f"Expected User 2 to be rank 2, got {lb[1].user_id}"
        assert lb[1].efficiency == 80.0, f"Expected 80.0 efficiency for User 2 PB, got {lb[1].efficiency}"
        assert lb[1].is_me is False
        print("test_leaderboard_tie_breaking: OK")

        # 1.3: Personal best in solves.py should be s1b (10.0s, 90% eff)
        hist = history(db=db, user=u1)
        assert hist.personal_best is not None, "Expected personal best"
        assert hist.personal_best.solve_time == 10.0
        assert hist.personal_best.efficiency == 90.0
        print("test_solves_personal_best_tie_breaking: OK")

        # 1.4: Pagination in history()
        # User 1 has 3 solves: s1c (newest, Jan 3), s1b (Jan 2), s1a (oldest, Jan 1)
        # Page 1: limit=2, offset=0 -> [s1c, s1b]
        p1 = history(limit=2, offset=0, db=db, user=u1)
        assert len(p1.solves) == 2
        assert p1.solves[0].id == s1c.id
        assert p1.solves[1].id == s1b.id
        # PB should still be s1b (overall fastest), even if paginating
        assert p1.personal_best.id == s1b.id

        # Page 2: limit=2, offset=2 -> [s1a]
        p2 = history(limit=2, offset=2, db=db, user=u1)
        assert len(p2.solves) == 1
        assert p2.solves[0].id == s1a.id
        # PB should still be s1b across all history
        assert p2.personal_best.id == s1b.id
        print("test_solves_pagination: OK")

    finally:
        db.close()


def test_lifespan_and_dockerfiles():
    # 1.5: Lifespan handler exists on FastAPI app
    assert app.router.lifespan_context is not None, "FastAPI app must have lifespan handler"

    # 1.5: Non-root USER in code/backend/Dockerfile
    backend_dockerfile = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Dockerfile"))
    with open(backend_dockerfile, "r") as f:
        backend_content = f.read()
    assert "USER " in backend_content, "code/backend/Dockerfile must contain USER directive"
    user_line = [line for line in backend_content.splitlines() if line.strip().startswith("USER")][0]
    assert user_line.strip() != "USER root", "code/backend/Dockerfile USER must be non-root"

    # 1.5: Non-root USER in code/frontend/Dockerfile
    frontend_dockerfile = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "Dockerfile"))
    with open(frontend_dockerfile, "r") as f:
        frontend_content = f.read()
    assert "USER " in frontend_content, "code/frontend/Dockerfile must contain USER directive"
    user_line_fe = [line for line in frontend_content.splitlines() if line.strip().startswith("USER")][0]
    assert user_line_fe.strip() != "USER root", "code/frontend/Dockerfile USER must be non-root"

    print("test_lifespan_and_dockerfiles: OK")


if __name__ == "__main__":
    test_models_indexes()
    test_leaderboard_and_solves_tie_breaking_and_pagination()
    test_lifespan_and_dockerfiles()
    print("ALL 1.3-1.5 AUDIT TESTS PASSED!")

