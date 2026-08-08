"""
Render six face images for a random scramble, so the camera-scan pipeline can
be tested (and demoed) without a physical cube in front of a webcam.

    cd code/backend && source venv/bin/activate
    python tools/make_test_faces.py                 # -> tools/test_faces/*.png
    python tools/make_test_faces.py --noise         # add lighting/blur, harder

It then reads its own images back through app.vision.detect and reports whether
the detected 54-character state matches the one it drew. That makes this both a
fixture generator and an end-to-end check of FR-06a and FR-17.

Upload the six PNGs, in the order printed, on the Camera Scan page.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import cv2
import numpy as np

from app.cube.constants import FACE_ORDER
from app.cube.scramble import random_scramble
from app.vision import detect

# BGR (OpenCV's channel order), roughly what a real cube photographs like
COLOUR_BGR = {
    "w": (245, 245, 245),
    "y": (30, 210, 245),
    "r": (40, 40, 220),
    "o": (20, 120, 240),
    "g": (70, 180, 70),
    "b": (200, 70, 40),
}

CELL = 160          # pixels per sticker
GAP = 10            # dark gap between stickers, like a real cube's body


def render_face(letters: str) -> np.ndarray:
    """Draw one 3x3 face from nine colour letters, row-major."""
    size = CELL * 3
    img = np.full((size, size, 3), 25, dtype=np.uint8)   # near-black body
    for i, ch in enumerate(letters):
        r, c = divmod(i, 3)
        y0, x0 = r * CELL + GAP, c * CELL + GAP
        y1, x1 = (r + 1) * CELL - GAP, (c + 1) * CELL - GAP
        cv2.rectangle(img, (x0, y0), (x1, y1), COLOUR_BGR[ch], thickness=-1)
    return img


def add_noise(img: np.ndarray, seed: int) -> np.ndarray:
    """Uneven lighting + slight blur + sensor noise, to exercise FR-17.

    Detection classifies every sticker against its own face's CENTRE, so a
    global lighting shift should not change the result. This is what proves it.
    """
    rng = np.random.default_rng(seed)
    h, w = img.shape[:2]

    # a soft brightness gradient across the face
    gx = np.linspace(0.72, 1.18, w, dtype=np.float32)
    gy = np.linspace(0.85, 1.10, h, dtype=np.float32)
    gradient = np.outer(gy, gx)[:, :, None]

    out = img.astype(np.float32) * gradient
    out += rng.normal(0, 4.0, out.shape)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.GaussianBlur(out, (3, 3), 0)   # soft, like a hand-held photo


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--noise", action="store_true",
                    help="add uneven lighting, blur and sensor noise")
    ap.add_argument("--moves", type=int, default=20, help="scramble length")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "test_faces"))
    args = ap.parse_args()

    facelets, moves = random_scramble(args.moves)
    os.makedirs(args.out, exist_ok=True)

    print(f"scramble : {' '.join(moves)}")
    print(f"expected : {facelets}\n")

    encoded = []
    for i, face in enumerate(FACE_ORDER):
        letters = facelets[i * 9:(i + 1) * 9]
        img = render_face(letters)
        if args.noise:
            img = add_noise(img, seed=i)
        path = os.path.join(args.out, f"{i + 1}_{face}.png")
        cv2.imwrite(path, img)
        encoded.append(cv2.imencode(".png", img)[1].tobytes())
        print(f"  {i + 1}. {face}  {letters}  ->  {path}")

    # --- read our own images back through the detector -------------------
    detected = detect.detect_facelets(encoded)
    matches = sum(a == b for a, b in zip(detected, facelets))

    print("\n--- detection accuracy (this is the thing under test) ---")
    print(f"detected : {detected}")
    print(f"stickers : {matches}/54 correct")

    if detected != facelets:
        for i, face in enumerate(FACE_ORDER):
            for j in range(9):
                k = i * 9 + j
                if detected[k] != facelets[k]:
                    print(f"  {face} cell {j} (row {j // 3}, col {j % 3}): "
                          f"expected {facelets[k]!r}, got {detected[k]!r}")

    # --- capture-quality heuristics (informational, NOT a pass/fail) -----
    # These are the FR-04 "prompt a retake" flags. They are absolute
    # thresholds on a real photo's edge energy and brightness, and a flat
    # synthetic render has far less high-frequency detail than a photograph,
    # so `blurry` is expected to trip here. The numbers are printed so the
    # thresholds can be tuned against real phone photos, which is what
    # detect.py's own comments ask for.
    print("\n--- capture quality (informational) ---")
    print(f"thresholds: blur variance < {detect.BLUR_VAR_MIN}, "
          f"mean brightness < {detect.DARK_V_MAX}")
    for i, face in enumerate(FACE_ORDER):
        img = cv2.imdecode(np.frombuffer(encoded[i], np.uint8), cv2.IMREAD_COLOR)
        var = cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        val = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 2].mean()
        q = detect.assess_quality(encoded[i])
        flags = ", ".join(k for k, v in q.items() if v) or "ok"
        print(f"  {face}: blur_var={var:8.1f}  brightness={val:5.1f}  -> {flags}")

    if detected == facelets:
        print("\nROUND TRIP OK -- the detector recovered the exact cube state.")
        print(f"Upload {args.out}/ (in numbered order) on the Camera Scan page.")
        return 0

    print("\nMISMATCH -- a sticker was misread. Check the cells listed above "
          "against the thresholds at the top of app/vision/detect.py")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
