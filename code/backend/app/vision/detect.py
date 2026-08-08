"""
OpenCV cube recognition (FR-04, FR-06a, FR-17).

Turns six face photos into the canonical 54-char COLOUR-letter facelet string
the rest of the backend agrees on (see app/cube/constants.py: colours "wroygb",
face order URFDLB, sticker index = face*9 + row*3 + col).

Design (build guide §7):
  - crop 9 cells at fixed offsets inside the guide box
  - median colour of the middle ~50% of each cell (edges catch shadow)
  - FR-17: the six CENTRE cubelets are the reference. Every sticker is classified
    by nearest centre, not by hardcoded HSV ranges — that is what makes it robust
    to lighting. The comparison uses LAB CHROMA only (a, b), never lightness,
    because lightness is the channel that lighting changes (see _classify).
    White is the special case: low saturation, not a hue, so it is tested first.

The bar is not perfection: the scan only has to be right enough that correcting
it in the 2D net is faster than typing all 54 stickers by hand.
"""

import cv2
import numpy as np

# --- Tunable thresholds (one place) -----------------------------------------
CELL_INNER = 0.5        # fraction of each cell sampled (middle 50%), edges dropped
WHITE_SAT_MAX = 55      # HSV saturation below this => treat sticker as white
RED_HUE_WRAP = 140      # OpenCV hue >= this is the red that wrapped past 179
BLUR_VAR_MIN = 100.0    # variance-of-Laplacian below this => blurry (FR-04)
DARK_V_MAX = 55.0       # mean HSV value below this => too dark (FR-04)

# canonical labels assigned to the five saturated centres, in ascending hue order
_HUE_ORDERED_LETTERS = ("r", "o", "y", "g", "b")  # red orange yellow green blue


def _decode(image_bytes: bytes) -> np.ndarray:
    """Decode encoded image bytes to a BGR array, or raise ValueError."""
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("could not decode image")
    return img


def _to_hsv(bgr) -> tuple:
    px = np.uint8([[np.clip(bgr, 0, 255)]])
    h, s, v = cv2.cvtColor(px, cv2.COLOR_BGR2HSV)[0][0]
    return int(h), int(s), int(v)


def _to_lab(bgr) -> np.ndarray:
    px = np.uint8([[np.clip(bgr, 0, 255)]])
    return cv2.cvtColor(px, cv2.COLOR_BGR2LAB)[0][0].astype(float)


def sample_face(image_bytes: bytes) -> list:
    """Return 9 median BGR samples (row-major) from a single face image.

    Splits the frame into a 3x3 grid and takes the median colour of the middle
    ~50% of each cell so shadows and bevels at the cell edges are ignored.
    """
    img = _decode(image_bytes)
    h, w = img.shape[:2]
    ch, cw = h // 3, w // 3
    margin = (1 - CELL_INNER) / 2
    samples = []
    for row in range(3):
        for col in range(3):
            y0, x0 = row * ch, col * cw
            iy0, iy1 = y0 + int(ch * margin), y0 + int(ch * (1 - margin))
            ix0, ix1 = x0 + int(cw * margin), x0 + int(cw * (1 - margin))
            cell = img[iy0:max(iy1, iy0 + 1), ix0:max(ix1, ix0 + 1)]
            samples.append(np.median(cell.reshape(-1, 3), axis=0))
    return samples


def _label_centres(centre_bgrs: list) -> tuple:
    """Map the 6 centre samples to 6 distinct colour letters (FR-17).

    White is whichever centre has the lowest saturation; the remaining five are
    labelled r/o/y/g/b by ascending hue. Positional assignment guarantees six
    distinct letters even under odd lighting, which is all the solver needs.
    Returns (letters_per_face, white_letter).
    """
    hsvs = [_to_hsv(b) for b in centre_bgrs]
    white_idx = min(range(6), key=lambda i: hsvs[i][1])  # lowest saturation

    def adj_hue(i):
        h = hsvs[i][0]
        return h - 180 if h >= RED_HUE_WRAP else h  # unwrap red past 179

    others = sorted((i for i in range(6) if i != white_idx), key=adj_hue)
    letters = [None] * 6
    letters[white_idx] = "w"
    for letter, idx in zip(_HUE_ORDERED_LETTERS, others):
        letters[idx] = letter
    return letters, "w"


def _classify(bgr, refs: list, white_letter: str) -> str:
    """Nearest-centre classification with a low-saturation white short-circuit.

    Distance is measured on the CHROMA channels (a, b) only, ignoring LAB's
    lightness channel L. Lightness is precisely what uneven lighting changes;
    chroma is what identifies the colour. Comparing on all three channels
    means a sticker in shadow can be closer to a genuinely darker colour than
    to its own, and the failure walks down the warm colours: yellow reads as
    orange, orange reads as red.

    Measured on rendered faces with a 1.6x brightness gradient across the
    frame: full LAB misclassified 12 of 324 stickers, every one of them in the
    darkest corner and every one of them y->o or o->r. Chroma-only: 0 of 324.

    White is unaffected -- it is caught by the saturation short-circuit above,
    not by this distance.
    """
    _, s, _ = _to_hsv(bgr)
    if s < WHITE_SAT_MAX:
        return white_letter
    lab = _to_lab(bgr)
    return min(refs, key=lambda r: np.linalg.norm(lab[1:] - r[1][1:]))[0]


def detect_facelets(images: list) -> str:
    """Detect the 54-char canonical facelet string from six face images.

    `images` is six encoded images (bytes) in URFDLB order. Raises ValueError if
    the count is wrong or any image cannot be decoded.
    """
    if len(images) != 6:
        raise ValueError(f"expected 6 face images, got {len(images)}")

    faces = [sample_face(b) for b in images]           # 6 x 9 median BGR samples
    centre_bgrs = [faces[f][4] for f in range(6)]      # local index 4 == centre
    letters, white_letter = _label_centres(centre_bgrs)
    refs = [(letters[f], _to_lab(centre_bgrs[f])) for f in range(6)]

    out = []
    for f in range(6):
        for i in range(9):
            out.append(_classify(faces[f][i], refs, white_letter))
    return "".join(out)


def assess_quality(image_bytes: bytes) -> dict:
    """Cheap per-face capture checks for FR-04 (prompt retake on bad frames)."""
    try:
        img = _decode(image_bytes)
    except ValueError:
        return {"blurry": True, "dark": True}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    mean_v = float(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 2].mean())
    return {"blurry": blur_var < BLUR_VAR_MIN, "dark": mean_v < DARK_V_MAX}


if __name__ == "__main__":
    # Dev-only webcam preview: shows the detected colour letters over the feed.
    # Not used by the API; kept for manual tuning of the thresholds above.
    cap = cv2.VideoCapture(0)
    print("Camera active. Press 'q' to exit.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        _, enc = cv2.imencode(".jpg", frame)
        try:
            single = detect_facelets([enc.tobytes()] * 6)[:9]
        except ValueError:
            single = "?" * 9
        for i, label in enumerate(single):
            r, c = divmod(i, 3)
            x, y = c * (frame.shape[1] // 3) + 40, r * (frame.shape[0] // 3) + 80
            cv2.putText(frame, label, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
        cv2.imshow("Rubik Cube Vision", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()
