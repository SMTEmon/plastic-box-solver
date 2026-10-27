import os
import sys
import warnings
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import _compat_imp_shim  # noqa: F401
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.cube.constants import SOLVED
from app.cube import validate as validate_mod
from app.vision import detect
from app.db.database import Base, declarative_base
from app.db.models import Solve, User
from app.utils.auth_utils import create_access_token


def test_3_1_validate_colours_and_centres():
    # 1. Valid solved cube should pass
    validate_mod.validate(SOLVED)

    # 2. Non-canonical colours: replace 'w' with 'x'
    bad_colours = "x" * 9 + SOLVED[9:]
    with pytest.raises(ValueError, match="colours"):
        validate_mod.validate(bad_colours)

    # 3. Invalid centres: swap U and D centres ('w' and 'y')
    # SOLVED has 'w' at index 4 (U center) and 'y' at index 31 (D center)
    facelets_list = list(SOLVED)
    facelets_list[4], facelets_list[31] = facelets_list[31], facelets_list[4]
    bad_centres = "".join(facelets_list)
    with pytest.raises(ValueError, match="centres"):
        validate_mod.validate(bad_centres)

    # 4. Valid reoriented centres (e.g. bwogyr from X then Y rotation) must pass
    from app.cube.moves import apply_moves
    bwogyr = apply_moves(SOLVED, ["X", "Y"])
    validate_mod.validate(bwogyr)

    print("test_3_1_validate_colours_and_centres: OK")



def test_3_2_fixed_centre_letters_in_detect():
    # Verify detect.detect_facelets classifies centres in URFDLB order as w, r, g, y, o, b
    import cv2
    import numpy as np

    # Create 6 monochromatic images for URFDLB in standard BGR colors
    # U=white, R=red, F=green, D=yellow, L=orange, B=blue
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

    result = detect.detect_facelets(encoded_faces)
    assert len(result) == 54
    centres = [result[i * 9 + 4] for i in range(6)]
    assert centres == list("wrgyob"), f"Expected centres 'wrgyob', got {''.join(centres)}"
    print("test_3_2_fixed_centre_letters_in_detect: OK")


def test_3_4_camera_scan_blob_cleanup_pattern():
    camera_scan_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "Components", "CameraScan.jsx")
    )
    with open(camera_scan_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "blobUrlsRef" in content, "CameraScan.jsx must track URLs via blobUrlsRef"
    assert "useEffect(() => {\n    const urls = blobUrlsRef.current;\n    return () => {" in content or \
           "useEffect(() => {\r\n    const urls = blobUrlsRef.current;\r\n    return () => {" in content, \
           "CameraScan.jsx unmount effect must capture blobUrlsRef and clean up on unmount"
    assert "}, []);" in content, "CameraScan.jsx unmount cleanup effect must have [] dependency array"
    print("test_3_4_camera_scan_blob_cleanup_pattern: OK")


def test_3_6_modern_sqlalchemy_and_timezone_utc():
    # 1. Check database.py uses sqlalchemy.orm.declarative_base
    db_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "db", "database.py"))
    with open(db_file, "r", encoding="utf-8") as f:
        db_content = f.read()
    assert "from sqlalchemy.orm import declarative_base" in db_content, "database.py must import declarative_base from sqlalchemy.orm"
    assert "sqlalchemy.ext.declarative" not in db_content, "database.py must not use deprecated sqlalchemy.ext.declarative"

    # 2. Check models.py and auth_utils.py do not use datetime.utcnow()
    models_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "db", "models.py"))
    with open(models_file, "r", encoding="utf-8") as f:
        models_content = f.read()
    assert "utcnow" not in models_content, "models.py must not use deprecated datetime.utcnow"
    assert "timezone.utc" in models_content, "models.py must use timezone.utc"

    auth_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "utils", "auth_utils.py"))
    with open(auth_file, "r", encoding="utf-8") as f:
        auth_content = f.read()
    assert "utcnow" not in auth_content, "auth_utils.py must not use deprecated datetime.utcnow"
    assert "timezone.utc" in auth_content, "auth_utils.py must use timezone.utc"

    # 3. Create model instance and access token, ensuring NO DeprecationWarnings are raised
    with warnings.catch_warnings(record=True) as recorded:
        warnings.simplefilter("always")
        token = create_access_token({"sub": "test@example.com"})
        assert token

        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        TestingSession = sessionmaker(bind=engine)
        Base.metadata.create_all(bind=engine)
        session = TestingSession()
        u = User(email="test@example.com", display_name="test", hashed_password="pw")
        s = Solve(user_id=1, solve_time=10.0, move_count=20, optimal_moves=20, efficiency=100.0)
        session.add_all([u, s])
        session.commit()

        # Check that none of the recorded warnings are DeprecationWarning about utcnow
        utcnow_warnings = [
            w for w in recorded
            if issubclass(w.category, DeprecationWarning) and "utcnow" in str(w.message)
        ]
        assert len(utcnow_warnings) == 0, f"Expected 0 utcnow deprecation warnings, got {len(utcnow_warnings)}"

    print("test_3_6_modern_sqlalchemy_and_timezone_utc: OK")


if __name__ == "__main__":
    test_3_1_validate_colours_and_centres()
    test_3_2_fixed_centre_letters_in_detect()
    test_3_4_camera_scan_blob_cleanup_pattern()
    test_3_6_modern_sqlalchemy_and_timezone_utc()
    print("ALL AUDIT 3.1 - 3.6 TESTS PASSED!")
