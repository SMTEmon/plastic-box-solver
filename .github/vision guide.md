# Vision Guide — Plastic Box Solver

**Audience:** anyone (teammates, evaluators) who needs to understand or use the camera-scan feature without reading the source.
**State described:** `open-cv` branch (fast-forwarded to `backend` `45f4c2e`, plus the vision work described here).
**Companion docs:** `backend guide.md` (the rest of the backend), `srs.md` (requirements FR-04, FR-06a/b, FR-17), `build guide.md` §7 (the original design sketch).
**How to validate:** run `tests/test_vision.py`, or hit `POST /api/cube/scan` via Swagger (`/docs`) — see §2 and §4.

---

## 1. What the vision module is

The part of the backend that turns **six photos of a cube's faces into the 54-character
facelets string** the rest of the app already understands (scramble, validate, solve, 3D
view). It lives at `code/backend/app/vision/detect.py` and is exposed as one HTTP endpoint,
`POST /api/cube/scan`.

It uses **OpenCV** (`opencv-python`) + **NumPy** — both already in `requirements.txt`, no
new dependencies.

The bar (from `build guide.md` §7): *the scan does not need to be perfect — it needs to be
right enough that correcting it in the 2D net is faster than typing all 54 stickers by
hand.* The frontend is expected to show the detected state for confirmation/correction
before solving (FR-06c).

---

## 2. How to run it

From `code/backend/` (create the venv once — none is committed):

```bash
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

# logic test (no server needed) — builds synthetic faces, asserts, prints "ALL VISION TESTS OK"
./venv/bin/python tests/test_vision.py

# or run the server and try the endpoint in Swagger
./venv/bin/uvicorn app.main:app --reload      # http://127.0.0.1:8000/docs
```

There is also a dev-only webcam preview (`python app/vision/detect.py`) that overlays the
detected colour letters on a live feed — handy for eyeballing/tuning, not used by the API.

---

## 3. How detection works (plain English)

Per face image, the frame is split into a **3×3 grid** and the **median colour of the
middle ~50% of each cell** is taken (the edges catch shadow and the plastic bevel, so they
are ignored). Median, not average, so a glare speck doesn't drag the reading.

**The clever part — the centre cubelet is the reference (FR-17).** Instead of hardcoded
"red is hue 0–10" rules that break under different lighting, the system reads the **six
centre stickers** and uses them as the six reference colours for *this particular photo
set*. Every other sticker is then labelled by **which centre it is closest to** (distance
in CIE-Lab colour space). Because the references come from the same photos under the same
light, the classification holds up across lighting changes — verified by a test that dims
every image to 60% brightness and gets the identical result.

**White is a special case.** White isn't a hue, it's the *absence* of saturation, so a
sticker with low saturation is called white before the hue comparison runs. The six centres
themselves are labelled by: whichever centre has the lowest saturation is white, and the
other five are sorted by hue into red, orange, yellow, green, blue.

**Capture-quality checks (FR-04).** `assess_quality()` gives each frame two cheap flags —
`blurry` (variance-of-Laplacian too low) and `dark` (mean brightness too low) — so the UI
can ask the user to retake a bad face. Note: a perfectly flat, single-colour test image
reads as "blurry" because it has no detail; real cube photos have edges and don't.

All thresholds (`WHITE_SAT_MAX`, `BLUR_VAR_MIN`, `DARK_V_MAX`, etc.) are named constants at
the top of `detect.py` — tune them in one place against real photos.

---

## 4. The scan endpoint

`POST /api/cube/scan` — **one multipart request carrying all six face images at once**
(they must all be sent together because FR-17 needs the six centres side-by-side).

Request: form field **`images`** repeated six times, in **URFDLB order** (see §5).

```bash
curl -F "images=@U.jpg" -F "images=@R.jpg" -F "images=@F.jpg" \
     -F "images=@D.jpg" -F "images=@L.jpg" -F "images=@B.jpg" \
     http://127.0.0.1:8000/api/cube/scan
```

Response (`ScanResponse`):

```json
{
  "facelets": "wwwwwwwwwrrrrrrrrr...bbbbbbbbb",   // detected 54-char state
  "valid": true,                                   // did validate() pass?
  "detail": null,                                  // why invalid, when valid=false
  "faces": [                                       // per-face capture quality, URFDLB order
    {"face": "U", "blurry": false, "dark": false}, ...
  ]
}
```

- Sending anything other than 6 images → **422**.
- An illegal/unsolvable scan does **not** error — it returns `valid: false` with a `detail`
  message (e.g. `"colour 'w' appears 54x, need exactly 9"`) **and still returns the
  detected `facelets`**, so the frontend can load it into the 2D net for correction and
  flag which face(s) to rescan (FR-06b).

The returned `facelets` plugs directly into the existing `POST /api/cube/validate` and
`POST /api/cube/solve` (see `backend guide.md` §4).

---

## 5. Scanning order & orientation (important for the frontend)

For the result to be a legal, solvable cube, two things must hold:

1. **Face order** — the six images must be in this order:

   | # | Face | |
   |---|------|---|
   | 0 | **U** | Up / top |
   | 1 | **R** | Right |
   | 2 | **F** | Front |
   | 3 | **D** | Down / bottom |
   | 4 | **L** | Left |
   | 5 | **B** | Back |

2. **Per-face orientation** — each face is read row-major from **outside** (top-left
   sticker first, then left→right, top→bottom), so every face must be captured upright in a
   consistent orientation. This is exactly what the on-screen 3×3 guide frame (FR-04) is for.

Wrong order or a rotated face produces a physically inconsistent cube, which `validate()`
rejects. **Colours do not need to be on any particular face** — detection reads the centres
to figure out the scheme, so the user can hold any colour up; only the order/orientation
matters.

---

## 6. Output, in one line

**Six ordered face photos → one 54-character colour string** (`wroygb`, URFDLB order, index
= `face*9 + row*3 + col`), identical to the format defined in `backend guide.md` §1 and
`app/cube/constants.py`. Verified end-to-end: a rendered 20-move scramble round-tripped
exactly through `/scan` and solved in 21 moves.

---

## 7. SRS coverage

| FR | Requirement | Status |
|----|-------------|--------|
| FR-04  | Accept cube state via camera (six faces, retake on blurry/dark) | Backend done (`/scan` + quality flags); **camera UI pending** |
| FR-06a | Extract all 54 sticker colours from six images | Done |
| FR-06b | Reject illegal/unsolvable states with specific feedback | Done (reuses `validate.validate`) |
| FR-17  | Auto-calibrate colour from the centre cubelet | Done (centre-relative classification) |

---

## 8. Known limitations / next steps

- **Frontend camera UI is not built yet.** Needed in `code/frontend`: a `<video>` stream
  with a 3×3 guide overlay, capture of the six faces in URFDLB order, the `POST /api/cube/scan`
  call, and a 2D-net correction editor + confirm-before-solve preview (FR-04 UI, FR-05, FR-06c).
- **Thresholds are first guesses.** `blurry`/`dark`/white cutoffs in `detect.py` should be
  tuned against real phone/webcam photos of a cube.
- Detection assumes the guide frame is reasonably filled and roughly axis-aligned; it does
  not yet auto-detect the cube outline within a busy background.
