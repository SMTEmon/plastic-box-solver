"""
OpenCV cube recognition (FR-04, FR-06a, FR-17).

Turns six face photos into the canonical 54-char COLOUR-letter facelet string
the rest of the backend agrees on (see app/cube/constants.py: colours "wroygb",
face order URFDLB, sticker index = face*9 + row*3 + col).

Design (build guide §7):
  - crop to a centred square, then 9 cells at fixed offsets inside it
  - median colour of the middle ~50% of each cell (edges catch shadow)
  - FR-17: the six CENTRE cubelets are the reference. NOTHING here is a
    hardcoded colour value. Every sticker is classified by nearest centre, and
    even the white/colour cutoff is derived from the centres of this particular
    scan. That is what makes it robust to lighting.
      * distance uses LAB CHROMA only (a, b), never lightness, because
        lightness is the channel that lighting changes (see _classify)
      * white is the special case: it is an absence of saturation, not a hue,
        so it is tested first (see _white_threshold)

The bar is not perfection: the scan only has to be right enough that correcting
it in the 2D net is faster than typing all 54 stickers by hand.
"""

import cv2
import numpy as np

# --- Tunable thresholds (one place) -----------------------------------------
CELL_INNER = 0.5        # fraction of each cell sampled (middle 50%), edges dropped
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


def _centre_square(img: np.ndarray) -> np.ndarray:
    """Crop to the largest centred square.

    The 3x3 split assumes the face fills the frame. Phone and webcam photos are
    4:3 or 16:9, so without this the outer columns of the grid land on the
    background instead of on stickers -- which is a large source of wrong
    readings. A square image is unchanged by this.
    """
    h, w = img.shape[:2]
    side = min(h, w)
    y0, x0 = (h - side) // 2, (w - side) // 2
    return img[y0:y0 + side, x0:x0 + side]


def sample_face(image_bytes: bytes) -> list:
    """Return 9 median BGR samples (row-major) from a single face image.

    Crops to a centred square, splits it into a 3x3 grid, and takes the median
    colour of the middle ~50% of each cell so shadows and bevels at the cell
    edges are ignored.
    """
    img = _centre_square(_decode(image_bytes))
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
    Returns (letters_per_face, white_letter, saturations).
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
    return letters, "w", [h[1] for h in hsvs], white_idx


def _white_threshold(saturations: list, white_idx: int, bias: float = 0.0) -> float:
    """Saturation cutoff separating white from the five colours -- derived from
    THIS scan's own centres rather than hardcoded.

    WHITE_SAT_MAX used to be a fixed 55. That fails in both directions: under
    warm light a white sticker picks up a colour cast and can read well above
    55 (so it is classified as a colour), while a washed-out photo can pull a
    real colour below it (so it is classified as white).

    The six centres give the answer directly: the white centre's saturation is
    what white looks like today, and the least-saturated colour centre is the
    nearest thing it could be confused with. Split the difference.
    """
    s_white = saturations[white_idx]
    s_colour = min(s for i, s in enumerate(saturations) if i != white_idx)
    midpoint = (s_white + s_colour) / 2.0
    return float(np.clip(midpoint + bias, 25.0, 140.0))


def _classify(bgr, refs: list, white_letter: str, white_sat_max: float) -> str:
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
    if s < white_sat_max:
        return white_letter
    lab = _to_lab(bgr)
    return min(refs, key=lambda r: np.linalg.norm(lab[1:] - r[1][1:]))[0]


def detect_facelets(images: list, white_bias: float = 0.0) -> str:
    """Detect the 54-char canonical facelet string from six face images.

    `images` is six encoded images (bytes) in URFDLB order. Raises ValueError if
    the count is wrong or any image cannot be decoded.

    `white_bias` shifts the white/colour saturation cutoff. The router sweeps a
    few values when the first reading is not a legal cube (see detect_best).
    """
    if len(images) != 6:
        raise ValueError(f"expected 6 face images, got {len(images)}")

    faces = [sample_face(b) for b in images]           # 6 x 9 median BGR samples
    centre_bgrs = [faces[f][4] for f in range(6)]      # local index 4 == centre
    letters, white_letter, sats, white_idx = _label_centres(centre_bgrs)
    threshold = _white_threshold(sats, white_idx, white_bias)
    refs = [(letters[f], _to_lab(centre_bgrs[f])) for f in range(6)]

    out = []
    for f in range(6):
        for i in range(9):
            out.append(_classify(faces[f][i], refs, white_letter, threshold))
    return "".join(out)


# Sweep order: no bias first, then progressively more and less white-tolerant.
_WHITE_BIAS_SWEEP = (0.0, -12.0, 12.0, -24.0, 24.0, -36.0, 36.0)


def detect_best(images: list, is_legal) -> tuple:
    """Detect a cube, retrying with a few white cutoffs until one is legal.

    A single sticker read wrong makes the whole cube illegal, and the most
    common single-sticker error by far is white-vs-colour at the boundary --
    a washed-out yellow, or a white with a strong colour cast. Rather than
    hand the user an unusable result, try a small neighbourhood around the
    derived cutoff and keep the first reading that forms a physically
    possible cube.

    This is a search for a self-consistent answer, not a fudge: the legality
    check is the same parity-aware one the solver uses, and an illegal cube
    cannot be made legal by luck.

    `is_legal(facelets) -> bool`. Returns (facelets, bias_used, retried).
    """
    first = None
    for i, bias in enumerate(_WHITE_BIAS_SWEEP):
        facelets = detect_facelets(images, white_bias=bias)
        if first is None:
            first = facelets
        if is_legal(facelets):
            return facelets, bias, i > 0
    return first, 0.0, True   # nothing worked: return the unbiased reading


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
