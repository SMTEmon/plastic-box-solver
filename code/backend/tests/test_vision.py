import sys
import os

# Ensure we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import cv2
import numpy as np

from app.vision.detect import detect_facelets, sample_face, assess_quality
from app.cube.constants import SOLVED
from app.cube import validate as validate_mod

# Canonical western scheme in BGR (OpenCV order): U=white R=red F=green
# D=yellow L=orange B=blue, in URFDLB order.
FACE_BGR = {
    "U": (255, 255, 255),   # white
    "R": (0, 0, 255),       # red
    "F": (0, 255, 0),       # green
    "D": (0, 255, 255),     # yellow
    "L": (0, 165, 255),     # orange
    "B": (255, 0, 0),       # blue
}


def solid_face(bgr, size=150):
    """Encode a solid-colour face image (all 9 stickers the same colour)."""
    img = np.full((size, size, 3), bgr, dtype=np.uint8)
    ok, enc = cv2.imencode(".jpg", img)
    assert ok
    return enc.tobytes()


def solved_faces():
    return [solid_face(FACE_BGR[f]) for f in "URFDLB"]


# --- sample_face returns 9 samples ------------------------------------------
samples = sample_face(solid_face(FACE_BGR["R"]))
assert len(samples) == 9, len(samples)
print("sample_face returns 9 cells: OK")

# --- A solved cube is detected as the canonical SOLVED string ---------------
detected = detect_facelets(solved_faces())
assert len(detected) == 54, len(detected)
assert detected == SOLVED, f"{detected} != {SOLVED}"
validate_mod.validate(detected)  # raises if illegal/unsolvable
print("solved cube -> canonical SOLVED, passes validate: OK")

# --- FR-17: centre-relative, so a global brightness drop changes nothing ----
dim_faces = []
for f in "URFDLB":
    img = (np.full((150, 150, 3), FACE_BGR[f], dtype=np.float32) * 0.6).astype(np.uint8)
    ok, enc = cv2.imencode(".jpg", img)
    dim_faces.append(enc.tobytes())
assert detect_facelets(dim_faces) == SOLVED, "dimmed scan must classify identically"
print("FR-17 brightness robustness (V x0.6 unchanged): OK")

# --- White special case: a low-saturation face is 'w', not a random hue -----
grey_U = [solid_face((150, 150, 150))] + [solid_face(FACE_BGR[f]) for f in "RFDLB"]
grey_detected = detect_facelets(grey_U)
assert grey_detected[0:9] == "w" * 9, grey_detected[0:9]
print("low-saturation face classifies as white: OK")

# --- assess_quality flags blur and darkness (FR-04) -------------------------
rng = np.random.default_rng(0)
noise = rng.integers(0, 256, (200, 200, 3), dtype=np.uint8)
ok, enc = cv2.imencode(".png", noise)          # png: keep the high-frequency detail
sharp = assess_quality(enc.tobytes())
assert sharp["blurry"] is False, "sharp noise should not be flagged blurry"

blurred = cv2.GaussianBlur(noise, (0, 0), sigmaX=8)
ok, enc = cv2.imencode(".png", blurred)
assert assess_quality(enc.tobytes())["blurry"] is True, "heavy blur should be flagged"
print("assess_quality blur detection: OK")

dark = np.full((200, 200, 3), 10, dtype=np.uint8)
ok, enc = cv2.imencode(".png", dark)
q = assess_quality(enc.tobytes())
assert q["dark"] is True, "near-black frame should be flagged dark"

bright = np.full((200, 200, 3), 200, dtype=np.uint8)
ok, enc = cv2.imencode(".png", bright)
assert assess_quality(enc.tobytes())["dark"] is False, "bright frame is not dark"
print("assess_quality darkness detection: OK")

# --- Wrong image count is rejected ------------------------------------------
try:
    detect_facelets(solved_faces()[:5])
    raise AssertionError("expected ValueError for 5 images")
except ValueError:
    pass
print("wrong image count rejected: OK")

print("ALL VISION TESTS OK")
