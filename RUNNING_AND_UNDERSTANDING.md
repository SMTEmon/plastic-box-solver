# Plastic Box Solver — How to Run It, and What You Actually Built

> Written for you to read the night before the presentation. Everything here was verified
> against the real code in this repo, not assumed.
> Companion doc: `IMPLEMENTATION_PLAN.md` (what to build next).

---

## Part 0 — The one thing you must understand before you present

**The two halves are now connected.** They weren't before — a grep of the entire frontend for
`fetch(`, `axios`, `localhost:8000` and `/api/` used to return zero matches. Three things closed
that gap:

1. **A shared move engine.** `backend/app/cube/moves.py` opens with *"Python port of
   frontend/src/cube/geometry.js + moves.js"* — files that were never committed. They exist now
   (`src/cube/`), and every permutation table they generate is **byte-identical** to the Python
   ones. The frontend and backend cannot disagree about what a move does.
2. **A logical state.** The 3D cube used to have none — `Buttons.jsx` mutated the Three.js scene
   graph directly and nothing recorded what the cube *was*. There's now a zustand store holding
   the 54-character truth, which is what makes solved-detection, move counting and efficiency
   possible at all.
3. **An HTTP layer.** `src/lib/api.js` plus a Vite proxy. The scramble button, the validation
   check, auto-solve and guided mode all hit the real FastAPI backend.

4. **The camera scan UI.** `/scan` takes six face photos (webcam or upload), posts them to the
   OpenCV pipeline, and shows you what it saw sticker by sticker plus per-face blur/darkness
   flags. There's a generator script so you can test it without a physical cube.

5. **Accounts.** Register, sign in, and a Dashboard showing your solve history, personal best and
   average efficiency. A finished unassisted solve submits itself and appears on the leaderboard.

**What this means for your presentation:** you can now demo one continuous story end to end.
Register → scramble → solve → your time appears on the Dashboard and the leaderboard, with every
step crossing the network.

**What is still honest to say:** password reset, badges, exporting a solve, and the 2D net editor
for correcting a scan are not built. There's no profile *edit* form either, though the endpoint
exists. Part 6 has the exact coverage table.

### The bug that was hiding in here, and how it was found

Guided mode used to finish with the sidebar reporting **"Cube solved"** while the cube on screen
was visibly scrambled. That is the worst kind of bug: the model and the screen disagreed, and
neither one was obviously wrong.

The cause: the animation's direction table (`MOVE_SPEC` in `animate.js`) is written by hand and
was never tied to the model's permutation tables. The six face turns matched. The three
**whole-cube rotations `X`/`Y`/`Z` were inverted** — the model gives them a fixed direction of
`+1`, but the animation copied the face-turn rule (`-layer`), which is the opposite. A guided
beginner's-method solution is full of whole-cube rotations, so every one of them pushed the
screen further away from the model. Auto-Solve looked fine because Kociemba solutions are pure
face turns.

The fix is one character per line, but the interesting part is the test: `tests/visualParity.test.js`
rebuilds the permutation *implied by the animation table* and asserts it equals the permutation
*the model uses*, for all nine tokens. That class of bug can't come back silently now.

**This is your best "how did you debug it" story** — better than the colour-scheme one, because
you can show the failing test.

---

## Part 1 — How to run it

You need **two terminals**. Backend on port `8000`, frontend on port `5173`.

⚠️ **Start the backend first.** The frontend now depends on it — the scramble button, validation
and both solve modes are live API calls. With the backend down, the sidebar shows a red
"API offline" dot and those buttons return an error instead of silently doing nothing.

### ⚠️ First: the README is wrong

`README.md` says:

```
Go to /code
npm install
npm run dev
```

There is no `package.json` in `code/`. The correct path is `code/frontend`.
Fix the README before you submit — a grader who follows it gets an instant error.

---

### Terminal 1 — Backend (FastAPI)

```bash
cd ~/Desktop/plastic-box-solver/code/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Confirm it's alive:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok"}
```

**Then open `http://127.0.0.1:8000/docs` in your browser.** This is FastAPI's auto-generated
Swagger UI — every endpoint, clickable, with request/response schemas. **This is your backend
demo.** You don't need Postman on stage.

#### If the venv is broken

The venv was created with Python **3.14** (`venv/pyvenv.cfg` says `version = 3.14.5`). If you
moved the folder, changed machines, or upgraded Python, symlinks break. Rebuild:

```bash
cd ~/Desktop/plastic-box-solver/code/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Backend errors you might hit, and the fix

| Error | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'app'` | You ran uvicorn from the wrong folder | `cd code/backend` first — the `app.main:app` path is relative to there |
| `ModuleNotFoundError: No module named 'imp'` | Python 3.12+ removed `imp`; the ancient `future` package needs it | Already handled by `app/_compat_imp_shim.py`. Only breaks if you import `rubik_solver` **before** that shim |
| `no such column: users.email` | Old `sql_app.db` from before the schema change | `rm sql_app.db` and restart. `Base.metadata.create_all()` rebuilds it |
| The `/solve` request hangs forever | `rubik_solver` was fed the wrong colour scheme | See `app/cube/adapters.py` — the colour cipher. It hangs instead of erroring, which is why it's documented so heavily |
| `kociemba` fails to build on install | It compiles C. Needs build tools | It's **optional** — `solver.py` and `validate.py` both wrap the import in `try/except` and fall back to `rubik_solver`. Just note which path you're on |

**Know which solver path you're on** — a grader may ask. Check:

```bash
cd code/backend && source venv/bin/activate
python -c "import kociemba; print('kociemba ACTIVE — optimal ~20 moves')" \
  || echo "kociemba MISSING — falling back to rubik_solver (longer solutions, may emit X/Y/Z rotations)"
```

---

### Terminal 2 — Frontend (React + Vite)

```bash
cd ~/Desktop/plastic-box-solver/code/frontend
npm install     # first time only, ~1-2 min
npm run dev
```

Open the URL it prints — **http://localhost:5173**.

Run the frontend tests (no server needed, uses Node's built-in test runner):

```bash
cd code/frontend
npm test
# → 24 tests, 24 pass    ✅ verified
```

And the cross-language parity test, which needs the backend running:

```bash
npm run test:parity
# → 5 tests, 5 pass    ✅ verified
```

What the 24 cover: input parsing (6), the animation engine's queue / assisted playback /
rotations / undo / speed / pause / progress (8), **animation-vs-model direction for all nine move
tokens (4)**, and the exact HTTP request shapes the backend expects (6).

### Run the backend tests

```bash
cd code/backend && source venv/bin/activate
python tests/test_moves.py       # geometry engine invariants
python tests/test_stages.py      # 50 random scrambles solve + segment correctly
python tests/test_vision.py      # OpenCV colour detection on synthetic faces
```

`test_moves.py` runs with **zero dependencies** — I verified it. Good fallback if the venv
misbehaves on demo day:

```
GEOM[0] check OK
4x any move = identity: OK
sexy move x6 = identity: OK
U sends F top row to L: OK
move + inverse = identity: OK
rotations X/Y/Z invariants: OK
```

---

## Part 2 — Architecture in one picture

```
                     ┌──────────────────────── FRONTEND (port 5173) ────────────────────────┐
                     │                                                                       │
  Browser  ────────► │  main.jsx → Router.jsx                                                │
                     │      ├── /dashboard    Dashboard.jsx      (placeholder)               │
                     │      ├── /cube-input   CubeInput.jsx      ← paste 54 chars            │
                     │      ├── /scan         CameraScan.jsx     ← 6 photos → OpenCV         │
                     │      ├── /solve        SolveWorkspace.jsx ← 3 modes + live stats     │
                     │      └── /leaderboard  Leaderboard.jsx    (placeholder)               │
                     │                                                                       │
                     │  cube/facelets.js   ← canonical format, mirrors constants.py          │
                     │  cube/geometry.js   ← 3D layout, ported from moves.py                 │
                     │  cube/moves.js      ← generated permutation tables + X/Y/Z            │
                     │  cube/animate.js    ← layer re-parenting + MOVE QUEUE                 │
                     │  store/cubeStore.js ← facelets, history, timer, assisted flag         │
                     │  lib/api.js         ← every endpoint, on native fetch                 │
                     │  lib/cubeInput.js   → validates + parses to {U,R,F,D,L,B}             │
                     │  lib/mapToCubelets.js → faces → 27 cubelets × 6 material slots        │
                     │  Three/CubeScene.jsx → Canvas, OrbitControls, Environment             │
                     │  Components/Cube.jsx → 27 <Cubelet/>, Cubelet.jsx → 6 materials       │
                     │  Components/{KeyboardControls,MoveButtons}.jsx → turn controls        │
                     └───────────────────────────────────────────────────────────────────────┘
                              ↕  Vite proxy: /api → localhost:8000  (vite.config.js)
                     ┌──────────────────────── BACKEND (port 8000) ─────────────────────────┐
                     │  main.py  — FastAPI app, CORS, create_all(), 5 routers               │
                     │                                                                       │
                     │  routers/cube.py        /api/cube/{scramble,validate,scan,solve}      │
                     │  routers/auth.py        /api/auth/{register,login} + JWT deps         │
                     │  routers/solves.py      /api/solves  POST + GET                       │
                     │  routers/leaderboard.py /api/leaderboard                              │
                     │  routers/profile.py     /api/profile GET + PATCH                      │
                     │                                                                       │
                     │  cube/constants.py  canonical 54-char facelet format (SOURCE OF TRUTH)│
                     │  cube/moves.py      geometry-generated permutation tables             │
                     │  cube/scramble.py   guaranteed-solvable random states                 │
                     │  cube/validate.py   legality + solvability check                      │
                     │  cube/adapters.py   translate our format → each solver library's      │
                     │  cube/solver.py     kociemba (optimal) + rubik_solver (beginner)      │
                     │  cube/stages.py     replay-and-segment → 7 teaching stages            │
                     │  vision/detect.py   OpenCV: 6 photos → 54 colour letters              │
                     │  db/{database,models}.py  SQLAlchemy → SQLite (sql_app.db)            │
                     │  utils/auth_utils.py      bcrypt hashing + JWT encode/decode          │
                     └───────────────────────────────────────────────────────────────────────┘
```

---

## Part 3 — The single most important design decision

Everything in the backend agrees on **one data format**, defined in `app/cube/constants.py`:

> **A cube state is a 54-character string of COLOUR letters, in URFDLB face order,
> where index = `face*9 + row*3 + col`.**

```
 index:  0-8    9-17    18-26   27-35   36-44   45-53
 face:    U      R        F       D       L       B
colours: w=white  r=red  o=orange  y=yellow  g=green  b=blue

SOLVED = "wwwwwwwww" + "rrrrrrrrr" + "ggggggggg" + "yyyyyyyyy" + "ooooooooo" + "bbbbbbbbb"
```

**Why colour letters and not face letters (U/R/F/D/L/B)?** Because two different solver
libraries want two different alphabets. With colour letters, both adapters in `adapters.py`
are two lines each. With face letters, one would be a map and the other its inverse. This is
`build guide.md` §4.2 and it's a genuinely good answer if someone asks "why this format?"

**Slide-worthy:** one canonical format + thin adapters at each boundary = the Adapter pattern.
Name it.

---

## Part 4 — File-by-file: what each piece does and why it's non-obvious

### Backend — the cube engine (`app/cube/`)

#### `constants.py` — the contract
27 lines. Defines `FACE_ORDER`, `COLOURS`, `SOLVED`, and the index formula. Every other module
in the project is downstream of this file.

#### `moves.py` — permutation tables, *generated from 3D geometry*
**This is your strongest technical talking point.**

The naive way to implement "R turns the right face" is to hand-write a 54-entry lookup table
for each of the 6 faces. That's 324 numbers, typed by hand, and one typo produces a bug that
only shows up 15 moves into a solve.

Instead this file **derives** them:

1. `_LAYOUT` gives each face a **normal vector** and a `(row, col) → (x, y, z)` mapping.
2. `GEOM` builds all 54 stickers as `{position, normal}` pairs in 3D space.
3. `INDEX_OF` inverts that: `(position, normal) → sticker index`.
4. `_rot90` rotates a vector 90° about an axis.
5. `_build_permutation(face)` rotates every sticker in that layer and looks up where it lands.

```python
perm[j] = i    # "the sticker that is now at j came from i"
```

`apply_move` then does the whole turn in one line:

```python
out = "".join(out[src] for src in perm_table)
```

`R'` = apply 3 times. `R2` = apply twice. No special cases.

**Why it matters:** the same geometry is expressed in the frontend's `mapToCubelets.js`. Because
both are derived from the same layout rather than hand-typed, the frontend and backend
**cannot silently disagree** about what "R" means. The header comment says exactly this.

It also handles **whole-cube rotations** `X`/`Y`/`Z` via `_build_rotation` — identical code but
with no layer filter, so *all 54* stickers move. You needed these because `rubik_solver`'s
beginner method emits "rotate the cube in your hands" instructions, not just layer turns.

#### `scramble.py` — the theory note that will impress a supervisor
Read the docstring. Paraphrased:

> You cannot generate a random cube by shuffling 54 characters. A Rubik's cube has three parity
> constraints: corner orientation sums to 0 mod 3, edge orientation sums to 0 mod 2, and overall
> permutation parity must be even. **Only 1 in 12 naive arrangements with correct colour counts
> is actually solvable.** Shuffle randomly and ~92% of your "cubes" make the solver throw.

The fix: start from `SOLVED` and apply random legal turns. Every reachable state is solvable
**by construction** — the inverse of the scramble is a solution. It also skips a move if it's on
the same face as the previous one, so you don't waste turns on `R R'`.

I verified this: 12 random moves, applied the inverse in reverse order, got back exactly `SOLVED`.

#### `validate.py` — cheap checks first, solver as final judge
1. Length is 54? (instant, friendly message)
2. Does every colour appear exactly 9 times? (instant)
3. Hand it to the solver — **the solver is the only thing that can catch parity violations.**

Steps 1–2 exist purely so the common user mistakes get a fast, human-readable error instead of a
cryptic solver exception.

#### `adapters.py` — the bug that cost you the most time
`to_kociemba` is easy: read the 6 centre colours, build `colour → face letter`, translate.

`to_rubik_solver` is where the landmine is. **`rubik_solver` hardcodes its own colour scheme
internally** (`D=white, U=yellow, R=green, F=red, B=orange, L=blue`). Your canonical scheme is
the standard western one (`U=white, F=green, R=red`). Feed it your colours and:

> **It does not error. It silently mis-parses and then hangs forever inside its own lookup tables.**

The fix is a 3-swap substitution cipher: `w↔y, g↔r, b↔o`. It's a pure *recolouring*, not a
spatial rotation, so it's valid for any facelet string.

**This is a great "what went wrong and how did you debug it" story.** A silent hang is much harder
to diagnose than a clean exception, and you found it by testing against the library's own engine.

#### `solver.py` — three fixes stacked on top of a third-party library
`solve_optimal` → Kociemba two-phase, ~20 moves. Used for **both** Auto-Solve **and** as the
denominator of the efficiency percentage.
`solve_guided` → beginner's method, human-followable, longer.

Three non-obvious corrections applied to `rubik_solver`'s raw output:

1. **`_translate` — rotation direction is mirrored.** `rubik_solver`'s `X/Y/Z` spin the opposite
   way to your geometry. Face turns `U..B` map 1:1. This was *derived empirically* by applying
   each move in their engine and matching resulting facelet strings — not guessed.
2. **`_corrective_rotation` — final orientation drift.** `rubik_solver` stops when the cube is
   *uniform*, which can leave it visually solved but **reoriented**. So the code does a **BFS over
   all 24 whole-cube orientations** (`_orientation_sequences`) and appends the one rotation that
   lands it on your exact `SOLVED` string.
3. **`_trim_after_solved` — redundant trailing moves.** `rubik_solver` appends no-ops after the
   cube is already solved (e.g. a trailing `U U U U`). Cutting at the first move that reaches
   `SOLVED` is always a correct, shorter solution — this shrank some bloated ~250-move outputs.

The comment block at the bottom of the file also records that **CFOP throws a `KeyError`** in this
package version, which is why guided mode is beginner's method. See Part 7 for how to present that.

#### `stages.py` — the "replay-and-segment" trick
Guided mode needs the 7 classical beginner stages. Neither library gives you stages. But you
**don't re-implement the beginner's method.** Instead:

> Take the flat move list the solver already produced. Replay it one move at a time against your
> own `apply_move`. Cut the list at the first index where each stage's predicate flips true.

```
Bottom cross → Bottom layer → Middle layer → Top cross → Top face → Position corners → Solved
```

Two details worth mentioning:

- **The predicates compare stickers to face CENTRES, never to hardcoded colours.** That makes them
  completely immune to the `rubik_solver` colour cipher from `adapters.py` — they only ask
  "is this layer built relative to its own centre?"
- `rubik_solver` solves **bottom-up**, so once a stage is achieved it stays true. That's why
  `segment()` can walk the predicate list forward with a single cursor and never backtrack.

**This is the highest-value slide in your deck.** It's a real algorithmic insight: you got teaching
stages "for free" out of a library that doesn't provide them.

#### `vision/detect.py` — OpenCV colour recognition (FR-04, FR-06a, FR-17)
Pipeline: decode image → split into a 3×3 grid → take the **median colour of the middle 50%** of
each cell (edges catch shadow and bevels) → classify.

The classification is the clever part, and it's **FR-17 itself**:

> The six **centre cubelets** are the reference. Every sticker is classified by nearest-centre
> distance in **LAB colour space**, not by hardcoded HSV ranges.

Why LAB? Because euclidean distance in LAB approximates *perceptual* colour difference — so
"nearest colour" actually means what a human would call nearest.

**And why only two of LAB's three channels.** The distance uses the chroma channels `a` and `b`
and *ignores* lightness `L`. This was a real bug, found by the test generator:

> A yellow sticker in the shadowed corner of a frame was read as **orange**, because with
> lightness included, dark yellow sits closer to the orange reference than to its own. The error
> walks down the warm colours — yellow→orange, orange→red.

Lightness is precisely what uneven lighting changes; chroma is what identifies the colour.
Measured on rendered faces with a 1.6× brightness gradient: **full LAB misread 12 of 324
stickers, chroma-only misread 0.** White is unaffected because it's caught by the saturation
short-circuit before this distance is ever computed.

Worth telling as a story, because the *original* FR-17 test passed the whole time: it dimmed
every face uniformly, which the old code handled fine since the reference centres dimmed by the
same amount. It took a gradient *across* a single face — a sticker in shadow while its own
reference is not — to expose it. **A test that only exercises the easy case is worse than no
test, because it buys confidence you haven't earned.**

White is a special case handled first: it's *low saturation*, not a hue, so a saturation threshold
short-circuits before the distance comparison. Red is the other special case — its hue **wraps past
179** in OpenCV, so `RED_HUE_WRAP` unwraps it before sorting centres by hue.

`assess_quality` adds per-face capture checks: **variance-of-Laplacian** for blur (low variance =
few edges = out of focus) and mean HSV value for darkness. The endpoint returns these so the UI can
say "reface the U face, it's blurry."

Honest framing from the module docstring: *"The bar is not perfection: the scan only has to be right
enough that correcting it in the 2D net is faster than typing all 54 stickers by hand."* Use that
line — it shows engineering judgment about where to stop.

---

### Backend — the API layer (`app/routers/`)

#### `cube.py`
| Endpoint | Notes |
|---|---|
| `POST /api/cube/scramble?n_moves=20` | Returns `{facelets, moves}` |
| `POST /api/cube/validate` | Returns **200** with `{valid: false, detail}` — a rejection is a normal answer, not an error |
| `POST /api/cube/scan` | `multipart/form-data`, exactly 6 files, field name `images`, **URFDLB order** |
| `POST /api/cube/solve` | Returns **422** if the cube is illegal |

Note the deliberate inconsistency: `/validate` returns 200-with-false, `/solve` returns 422.
That's correct design — validation *is* the job of one, and a precondition of the other. But
**your frontend must handle both shapes.**

`/scan` returns the detected facelets **even when validation fails**, plus per-face
`FaceQuality`. That's intentional: the UI drops the imperfect result into the 2D net editor so the
user fixes 2 stickers instead of typing all 54.

#### `auth.py` — the gotcha that will break your first integration attempt
- `POST /api/auth/register` takes **JSON**.
- `POST /api/auth/login` takes **form-encoded** data (`OAuth2PasswordRequestForm`), and the field
  is called **`username` but carries the EMAIL**.

Sending JSON to `/login` will fail. Write that on a sticky note.

Two dependencies are exported:
- `get_current_user` — raises 401 if no valid token. For protected routes.
- `get_optional_user` — returns `None` instead of raising. This is why the leaderboard is
  **publicly viewable but personalised when logged in** (`is_me` flag).

That pair is a nice small design point to mention.

#### `solves.py`
`_efficiency = min(100, optimal/actual * 100)`, computed **server-side**. The client sends raw
numbers and never duplicates the formula — **the DB is the single source of truth.** Capping at 100
handles the case where a user beats the "optimal" solution.

`GET /api/solves` returns history newest-first plus `personal_best`. Empty history returns
`personal_best: null`, **not a 404** — an empty state is a valid state, not an error.

#### `leaderboard.py`
One row per user (their fastest solve), sorted by time ascending, ties broken by efficiency
descending, top 50. The comment is honest about the tradeoff: it's a full scan + in-Python
reduction rather than a SQL `GROUP BY`, chosen for clarity at class-project data volumes.

**If asked "does this scale?"** — say exactly that. Then say the fix is a windowed SQL query
(`ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY solve_time)`). Knowing the limit and the fix
scores better than pretending there isn't one.

---

### Backend — persistence & security

#### `db/database.py`
`DATABASE_URL` from env, defaults to `sqlite:///./sql_app.db`. `check_same_thread=False` is
required because FastAPI serves requests on multiple threads and SQLite objects to cross-thread
use by default. `get_db()` is a generator dependency — yields a session, always closes it.

#### `db/models.py`
`User` (id, email, display_name, avatar, hashed_password, created_at) ↔ `Solve` (solve_time,
move_count, optimal_moves, efficiency, scramble, solution, method) with a one-to-many relationship.

#### `utils/auth_utils.py`
bcrypt via passlib, JWT via python-jose, 30-minute expiry. **Passwords are never stored in
plaintext** — only the bcrypt hash. That's FR-01's acceptance criterion.

⚠️ **Two security issues you should raise yourself before a grader finds them:**
1. `SECRET_KEY` falls back to a hardcoded literal `"fallback_secret_key_for_testing_only"`.
2. **`sql_app.db` is committed to git** — I confirmed with `git ls-files`. Real user rows would
   be in your repo history.

Both are 10-minute fixes (see the plan doc). Naming them yourself turns a deduction into a
demonstration of security awareness.

---

### Frontend

#### `lib/cubeInput.js` — validation, three layers
Accepts either **one line of 54 chars** or **6 lines of 9**. Then:
1. Every character is one of `W Y R O B G`
2. Every colour appears exactly 9 times
3. Opposite centres are a legal pair: U/D ∈ {W,Y}, R/L ∈ {R,O}, F/B ∈ {B,G}, and not equal

Returns `{U:[...], R:[...], F:[...], D:[...], L:[...], B:[...]}`.

⚠️ **Format mismatch with the backend:** frontend uses **UPPERCASE** letters and an object of
arrays; backend uses a **lowercase** 54-char string. Same face order, different case and shape.
A converter is the first thing the plan doc builds.

⚠️ **One of the original tests is a false positive.** `"throws on invalid opposite centers"` uses a
fixture with R×11 and G×7, so the *colour-count* check throws before the opposite-centre branch is
ever reached — and `assert.throws` has no error matcher, so it passes anyway. The test passes
without testing the thing it names. Fix is in the plan doc. **If you find your own bad test and
fix it, that's a point in your favour.**

#### `lib/mapToCubelets.js`
Converts `{U,R,F,D,L,B}` into a map keyed `"x,y,z"` → array of 6 colours matching Three.js's
material order `[+x, −x, +y, −y, +z, −z]`. The per-face index math handles each face's own
row/column orientation — e.g. U's top row touches Back (`z = row-1`) while D's top row touches
Front (`z = 1-row`).

**I diffed this against `_LAYOUT` in `moves.py` sticker by sticker: the geometry already agrees
exactly on all six faces.** Say that — it means your two independently-written halves converged on
the same model.

#### `Components/Cube.jsx` + `Cubelet.jsx`
27 cubelets at every `(x,y,z)` in `{-1,0,1}³`. Each is a `RoundedBoxGeometry` with **6 separate
materials** (`attach={material-${i}}`) — one per face. Inward-facing sides render black, which is
what makes it look like a real cube instead of a colour blob.

#### `cube/animate.js` — how the animation works
The rotation trick is genuinely elegant, and worth explaining on a slide:

1. **Re-parent** the 9 cubelets of that layer from `cubeGroup` into `rotationGroup`, using
   `.attach()` — which preserves each object's world transform.
2. **Tween** `rotationGroup.rotation[axis]` by 90° with cubic easing.
3. **Re-parent them back** and zero the group's rotation and quaternion.

So you rotate **one group**, not nine objects.

This logic used to live inside a Leva debug panel (`Buttons.jsx`) and had two fatal flaws, both
now fixed:

- **It dropped moves.** `if (!JEASINGS.getLength())` silently discarded any move requested while
  an animation was in flight — which meant a 20-move solution would play about two moves and
  stop. There's now a real queue: `enqueue()` appends, and each animation's `onComplete` drains
  the next one.
- **It had no logical state.** Nothing recorded what the cube *was*. Now `onMoveDone` advances
  the store, and that is the **only** place the store advances.

#### The one invariant that keeps it correct
> The scene graph owns the visuals during a solve. The store owns the truth.
> Sticker colours are re-derived from the store **only** when `sceneEpoch` changes (load/reset).

If you re-derived colours on every move, you'd apply each turn twice — once by physically moving
the meshes, once by recolouring them. That's the subtlest bug in the whole frontend and it's
worth mentioning if someone asks how the 3D view stays in sync.

#### The placeholder pages
`Dashboard.jsx` and `Leaderboard.jsx` are still ~10-line stubs. The backend endpoints that feed
them are **already built and working** — this is pure wiring, not new logic. Frame it that way.

---

## Part 5 — Your demo script

Rehearse this. Do not improvise on stage.

### Setup (before you walk in)
- Both terminals already running. Backend first, then frontend.
- Browser tabs pre-opened: `localhost:5173/cube-input`, `localhost:5173/solve`,
  `127.0.0.1:8000/docs`.
- This scramble string in your clipboard **(verified: parses cleanly, all six centres correct)**:

```
BBYRWORYGRWBWRWOOWWOYYGBOGYWRGRYGOGGOBBYOGWYGROYRBBRWB
```

(Generated by 12 random moves: `D' R' L U' B2 R D2 U' B' F U' L'`)

Also keep a solved cube handy for contrast:

```
WWWWWWWWWRRRRRRRRRGGGGGGGGGYYYYYYYYYOOOOOOOOOBBBBBBBBB
```

---

### Act 1 — The connected round trip (5 min) ← this is your headline

1. **Point at the sidebar.** There's a green dot reading **"API connected"**. That's the frontend
   polling the backend's `/health` endpoint every 15 seconds. Your two halves are talking, live,
   on screen. *(If it's red, your backend isn't running — fix that before you start.)*

2. **`/cube-input` → click "Random Scramble."** This calls `POST /api/cube/scramble`. Say:
   > "That state came from the backend, and it's guaranteed solvable by construction — the server
   > scrambles from solved using random legal turns, because only 1 in 12 naive arrangements of
   > 54 stickers is actually a legal cube."

   The textarea fills, the 3D preview renders it, and the status line says
   **"Valid and solvable (verified by backend)."** Point out that this is a *second* check:
   local parsing catches colour counts, but only the solver can catch a parity violation.

3. **Break it deliberately.** Change one letter in the textarea. The status flips red with a
   specific message (`colour 'w' appears 10x, need exactly 9`) and **Solve Cube** greys out.
   Validation failing visibly and specifically is a feature.

4. **Undo your edit, click "Solve Cube."** This calls `POST /api/cube/solve` for the optimal
   solution, stores the move count as the efficiency denominator, and navigates to `/solve`.

5. **`/solve` — Interactive mode.** Drag to orbit. Then press `R`, `U`, `Shift+R`, `Shift+U` on
   the keyboard. Watch the **timer start on your first move** and the move counter climb. Press
   `Ctrl+Z` to undo — the counter goes back down. Say:
   > "The cube has a logical state now, so the timer, the move count and the efficiency score are
   > all real. Before this, the 3D view was just a scene graph with nothing behind it."

6. **Click "Auto-Solve."** Accept the warning dialog. The whole solution animates continuously to
   a solved cube, and the sidebar shows the move list. Use the **speed buttons** (0.25x–4x) and
   **Pause** — drop to 0.25x if you want the audience to actually follow a turn, or 4x to get to
   the solved cube fast. A progress bar tracks moves played.
   > "Every one of those moves came from the backend's Kociemba solver, and they're being replayed
   > through a JavaScript engine whose permutation tables are byte-identical to the Python ones.
   > That's why it lands exactly on solved."

   Point at the yellow **"Assisted run"** banner: that attempt is flagged and will never be
   submitted to the leaderboard. That's what keeps the ranking honest.

7. **Click "Guided."** The top of the sidebar becomes a single instruction card:
   > **Right face — clockwise** · a red swatch · `notation: R`
   > *"Turn the right layer (the red centre) 90° clockwise, looking at it from the right."*

   Click **Next** a few times. The card updates, the active stage highlights, and the stage help
   line tells you what you're building ("Make a plus sign on the bottom face…"). **"Play the rest
   of this stage"** runs one whole stage at a time so you're not clicking Next 26 times on stage.
   > "Neither solver library provides stages. I replay the solver's own move list against my
   > engine and cut it wherever each stage's predicate flips true."

   If you get lost after orbiting, hit **Reset view** in the top-right of the canvas, and turn on
   **Face labels** — every instruction is phrased by face name, so the names are drawn in the
   scene. The "Which side is which" panel shows the current centre colour per face, which is what
   actually tells you the cube's orientation.

**Do not click:** Dashboard or Leaderboard — those pages are still stubs.

---

### Act 1b — Camera scan (3 min) — the OpenCV story

You do not need a physical cube. Generate a test set first:

```bash
cd code/backend && source venv/bin/activate
python tools/make_test_faces.py --noise
```

It renders six face images for a random scramble, then **reads its own images back through the
detector** and prints `stickers: 54/54 correct` and `ROUND TRIP OK`. Run it on stage — it's a
five-second end-to-end proof of FR-06a and FR-17.

⚠️ **The "capture quality" section will flag the faces as blurry, and that is not a failure.**
Those are the FR-04 retake heuristics: absolute thresholds on a photo's edge energy. A flat
synthetic render has far less high-frequency detail than a real photograph, so it trips the blur
threshold by construction. The script prints the raw blur variance and brightness next to the
thresholds so you can see exactly how close it is — and `detect.py`'s own comments already say
those numbers are first guesses that need tuning against real phone photos. If someone asks,
that's the answer, and it's a legitimate known limitation rather than a bug.

Then go to **`/scan`** in the app:

1. Upload the six PNGs into the numbered slots. **Order is enforced by the slots** — URFDLB.
   Say: *"Wrong order or a rotated face produces a physically inconsistent cube, which the
   validator rejects. So the UI doesn't let the user get the order wrong."*
2. Click **Detect cube state.** You get back: the 54-character string, a legality verdict, a
   **3×3 colour grid of what it saw for each face**, and per-face blur/darkness flags.
   > "Every sticker is classified by distance to its own face's centre cubelet in LAB colour
   > space, not by fixed HSV ranges. That's FR-17, and it's why the `--noise` run with uneven
   > lighting still comes back exact."
3. Click **Solve this cube** — it goes straight into the solve workspace.

If you *do* have a cube and a webcam, **Use webcam** gives you a 3×3 guide frame and captures the
six faces in order, with a camera picker if you have more than one.

⚠️ **Open the app at `http://localhost:5173`, not at a LAN address like `192.168.x.x:5173`.**
Browsers only expose `getUserMedia` in a secure context — HTTPS or localhost. Over plain HTTP on
a LAN IP the API doesn't exist at all. The page now detects this and tells you, but it's the
single most likely reason the camera won't open on demo day.

---

### Act 2 — Backend via Swagger (4 min)

Go to `127.0.0.1:8000/docs`. Every step is "Try it out" → "Execute".

1. **`POST /api/cube/scramble`** → returns `{facelets, moves}`.
   Say: *"This is guaranteed solvable by construction — I never shuffle characters randomly,
   because only 1 in 12 naive arrangements is legal."*
2. **Copy the `facelets` into `POST /api/cube/solve`** with `method: "beginner"`.
   Point at `stages[]` in the response — **the seven teaching stages** with start/end indices.
   Say: *"Neither solver library provides stages. I replay the move list against my own engine and
   cut it where each stage predicate flips true."*
3. **Same facelets, `method: "optimal"`.** Contrast `moveCount` with the beginner run.
   Say: *"Both come back in the same response — the optimal count is the denominator of the
   efficiency score."*
4. **`POST /api/cube/validate` with a broken string** (change one letter). Show
   `{valid: false, detail: "colour 'w' appears 10x, need exactly 9"}` — 200, not an error.
5. **`POST /api/auth/register`** → **`POST /api/auth/login`** → copy the token → click the green
   **Authorize** button → **`GET /api/profile`** returns your user.
   Say: *"Register is JSON, login is form-encoded OAuth2 where the username field carries the
   email — that's the FastAPI security convention."*
6. **`POST /api/solves`** with a fake time and move count → note that `efficiency` comes back
   computed **server-side**. → **`GET /api/leaderboard`** shows the ranked row with `is_me: true`.

That sequence demonstrates **FR-01, 02, 03, 06b, 08a, 08b, 10, 12b, 13a, 13b, 14, 16** in four
minutes.

---

### Act 3 — Tests (2 min) ← the credibility act

```bash
cd code/frontend && npm run test:parity     # backend must be running
```

**This is the most important test in the project.** It scrambles 20 times on the backend, replays
each move list through the JavaScript engine, and asserts the resulting 54-character string is
identical. Then it does the same with real solutions.

> "This is what proves the frontend and backend can't drift. If this test ever fails, nothing
> downstream — auto-solve, guided stepping, solved-detection — is trustworthy."

```bash
npm test                                     # 10 tests, no backend needed
```

Four of those cover the animation engine specifically: that the queue never drops a move, that
assisted playback doesn't inflate the move count, that whole-cube rotations play back, and that
undo restores the exact previous state without double-applying.

```bash
cd code/backend && source venv/bin/activate && python tests/test_stages.py
```

*"50 random scrambles. Every guided and optimal solution replays to the exact solved string, and
every stage segmentation is contiguous and covers the whole move list."*

---

### Act 4 — The honest slide (1 min)

One slide titled **"Current state and next milestone."**

- ✅ Backend: 12 endpoints, working, HTTP-verified
- ✅ Shared cube engine: JS port verified byte-identical to Python
- ✅ Integration: scramble, validate, solve, auto-solve playback, guided stages
- ⚠️ Not yet built: login/register screens, dashboard, leaderboard UI, camera capture UI
- ➡️ Next: auth pages and the persistence loop — a completed unassisted solve posting to
  `/api/solves` and appearing on the leaderboard. Both endpoints already work; it's screen work.

Ending on a specific, technical next step beats trailing off.

---

## Part 6 — Requirement coverage (know this cold)

| FR | Requirement | Backend | Frontend | Demo-able today |
|---|---|---|---|---|
| FR-01 | Register (email + ≥8 char password) | ✅ `auth.py` | ✅ `/register` | **In the app** |
| FR-02 | Login | ✅ JWT | ✅ `/login`, token persists | **In the app** |
| FR-03 | View/update profile | ✅ `profile.py` | ⚠️ shown in sidebar, no edit form | Partially |
| FR-04 | Camera capture | ✅ `/scan` + quality checks | ✅ `/scan` page, webcam + upload | **In the app** |
| FR-05 | Manual colour input | n/a | ⚠️ textarea only, no 2D net picker | Yes |
| FR-06a | Extract 54 colours from 6 images | ✅ `detect.py` | ✅ wired + result grid | **In the app** |
| FR-06b | Validate legality + solvability | ✅ `validate.py` | ✅ local **+ backend** | **In the app** |
| FR-06c | 2D preview before solving | ❌ | ⚠️ 3D preview instead of 2D | Partially |
| FR-07 | Interactive rotatable 3D model | n/a | ✅ | **In the app** |
| FR-08a | Kociemba optimal solution | ✅ | ✅ wired | **In the app** |
| FR-08b | Beginner's-method solution | ✅ | ✅ wired | **In the app** |
| FR-09 | Interactive solve mode | n/a | ✅ state, timer, move count | **In the app** |
| FR-10 | Guided mode, move-by-move | ✅ `stages[]` | ✅ stage sidebar + stepping | **In the app** |
| FR-11 | Auto-solve animation | ✅ solution | ✅ queued playback | **In the app** |
| FR-12a | Track time + move count | ✅ storage | ✅ live | **In the app** |
| FR-12b | Efficiency % | ✅ server-side | ✅ live display | **In the app** |
| FR-13a | Persist solve history | ✅ `/api/solves` | ✅ auto-submits on solve | **In the app** |
| FR-13b | Personal best | ✅ | ✅ Dashboard | **In the app** |
| FR-14 | Global leaderboard | ✅ ranked + `is_me` | ✅ ranked table, row highlight | **In the app** |
| FR-15 | Password reset via email | ❌ deferred | ❌ | No |
| FR-16 | Random solvable scramble | ✅ `scramble.py` | ✅ button | **In the app** |
| FR-17 | Centre-cubelet auto-calibration | ✅ `_label_centres` | n/a | **`make_test_faces.py --noise`** |
| FR-18 | Undo / redo | n/a | ✅ Ctrl+Z / Ctrl+Shift+Z | **In the app** |
| FR-19 | Export / share solve summary | ❌ | ❌ | No |
| FR-20 | Keyboard shortcuts | n/a | ✅ U D L R F B, Shift, 2 | **In the app** |
| FR-21 | Badges / milestones | ❌ deferred | ❌ | No |
| FR-22 | Logout from any page | n/a | ✅ sidebar user block | **In the app** |

**Count: 26 of 29 implemented on at least one side, 21 of them demonstrable in the running app.
2 partial, 3 not started.** Say a number. Vagueness reads as not knowing.

---

## Part 7 — Questions you will be asked, and how to answer

**"Why two solver libraries?"**
> Different jobs. Kociemba gives a near-optimal ~20-move solution — great for auto-solve and as the
> efficiency denominator, but the moves are meaningless to a human. `rubik_solver`'s beginner method
> is longer but follows the algorithms people actually learn, which is what guided mode needs.
> They're complementary, not alternatives.

**"Why beginner's method instead of CFOP? The proposal says CFOP."**
> Two reasons. Technically, `rubik_solver`'s CFOP implementation throws a `KeyError` on ordinary
> inputs in this package version — it's documented at the bottom of `solver.py`. Pedagogically,
> beginner's method serves the stated motivation better: the target user is someone who never
> learned to solve a cube, and CFOP assumes you already can. I'll note the substitution in the
> report.

**"Is the frontend connected to the backend?"**
> Yes. Vite proxies `/api` to the FastAPI server, and `src/lib/api.js` is the single place every
> endpoint is called. Scramble generation, cube validation, and both solve modes are live round
> trips. What isn't connected yet is the auth and persistence UI — those endpoints work, but there
> are no screens for them.

**"How do you know your move engine is correct?"**
> Four ways. Algebraic invariants — four applications of any turn is the identity, a move composed
> with its inverse is the identity, `R U R' U'` returns to solved after six repetitions.
> Cross-library — 50 random scrambles all solve to the exact solved string in Python.
> Cross-language — all nine permutation tables in the JavaScript port are byte-identical to the
> Python ones, and there's a test that replays the backend's own scrambles and solutions through
> the JS engine. And structurally — the tables are generated from geometry rather than typed, so
> there's no typo surface.

**"How does the 3D view stay in sync with the logical state?"**
> During a solve the scene graph owns the visuals — turning a layer physically re-parents and
> rotates those meshes, and the sticker colours travel with them. The store owns the logical truth
> and is advanced only when an animation completes. Colours are re-derived from the store only on
> load or reset. If I re-derived them on every move I'd apply each turn twice, once by moving the
> meshes and once by recolouring them.

**"What happens if I click Auto-Solve halfway through my own solve?"**
> It asks for confirmation, then sets a permanent `assisted` flag for that session. The attempt
> still finishes and still shows a time, but it's never submitted to `/api/solves`, so it can't
> reach the leaderboard. The banner in the sidebar makes that visible while you're solving.

**"What was the hardest bug?"**
> Guided mode reporting "solved" while the cube on screen was visibly scrambled. Two independent
> descriptions of the same geometry had drifted: the model's permutation tables, which are
> generated from 3D geometry, and the animation's direction table, which is written by hand. They
> agreed on the six face turns but disagreed on the three whole-cube rotations — the model gives
> those a fixed direction while a face turn derives its direction from which layer it is. Guided
> solutions are full of whole-cube rotations, so every one pushed the screen further from the
> model; auto-solve looked fine because Kociemba solutions are pure face turns. The fix was three
> signs. The real fix was a test that rebuilds the permutation implied by the animation table and
> asserts it equals the model's, so the two can never diverge silently again.

**"What was the hardest bug before that?"**
> The `rubik_solver` colour scheme. It hardcodes its own internal scheme, and if you feed it a
> different one it doesn't error — it silently mis-parses and then hangs forever inside its own
> lookup tables. An infinite hang gives you no stack trace. I isolated it by applying single moves
> through their engine and diffing the resulting facelet strings against mine, which revealed both
> the colour mismatch and, separately, that their whole-cube rotations spin the opposite way.

**"How accurate is the colour detection?"**
> On rendered faces with uneven lighting, blur and sensor noise, it recovers all 54 stickers
> exactly — `tools/make_test_faces.py --noise` proves that end to end in one command. Getting
> there required one real fix: the nearest-centre comparison originally included LAB's lightness
> channel, so a sticker in shadow could read as a genuinely darker colour, and yellow in a dark
> corner came back as orange. Dropping lightness and comparing chroma only took it from 12 errors
> in 324 to zero. On real photos it will be worse than on renders, and that's fine by design —
> the bar is that correcting the scan beats typing 54 letters by hand.

**"Your test suite passed while that bug existed. Why?"**
> Because the FR-17 test only exercised the easy case. It dimmed all six faces uniformly, which
> the old code handled fine — every reference centre dimmed by the same amount, so the relative
> distances didn't change. The realistic case is a gradient *across* one face, where a sticker is
> in shadow but its own reference centre is not. I added that, and it fails against the old code.
> Same lesson as the rotation bug: a test that only covers the easy path buys confidence you
> haven't earned.

**"Does the leaderboard scale?"**
> No, and I know why. It's a full table scan with an in-Python reduction — fine at class-project
> volume, chosen for readability. At scale it becomes a windowed SQL query partitioned by user_id.

**"Any security concerns?"**
> Two I'd fix before deployment. `SECRET_KEY` has a hardcoded development fallback that should fail
> loudly outside dev, and `sql_app.db` is currently tracked in git and needs to come out of history.
> Passwords themselves are fine — bcrypt-hashed via passlib, never stored plaintext.

**"Why SQLite when the proposal says PostgreSQL?"**
> Configuration, not architecture. `database.py` reads `DATABASE_URL` from the environment and only
> falls back to SQLite; `psycopg2-binary` is already installed. Switching is one env var. The one
> real gap is migrations — tables are created via `create_all()` at import, so schema changes need
> Alembic before there's production data.

---

## Part 8 — Cleanup with disproportionate payoff

Already done in this round:

- ✅ Dead `alert()` on **+ New Solve** now navigates to `/cube-input`
- ✅ Keyboard shortcuts are real (they were advertised in the UI but not implemented)
- ✅ Leva debug panel removed — it was serving as the production UI
- ✅ `Router.jsx` catch-all added; unknown URLs used to render a blank page
- ✅ `.gitignore` fixed — **`*.md` was silently ignoring every markdown file in the repo.**
  That's why `build guide.md` "isn't in the repo": it was never committable. Worth knowing.

Still worth doing before you present:

1. **Fix `README.md`** — `code/frontend`, not `code`. Add the backend commands too.
2. **Untrack the database** (it's committed, and it holds real user rows):
   ```bash
   cd ~/Desktop/plastic-box-solver
   git rm --cached code/backend/sql_app.db
   echo "sql_app.db" >> code/backend/.gitignore
   ```
3. **Pin `requirements.txt`** — it's fully unpinned, which is how the kociemba build broke in the
   first place:
   ```bash
   cd code/backend && source venv/bin/activate && pip freeze > requirements.txt
   ```
4. **Commit `build guide.md` and `srs.md`** into `docs/` now that markdown isn't blanket-ignored.
   Both `solver.py` and `stages.py` cite the build guide by section number.
5. **Fix the false-positive test** in `tests/cubeInput.test.js` (see Part 4).

---

## Part 9 — The three sentences to memorise

> **1.** "The whole system agrees on one canonical format — a 54-character colour string in URFDLB
> order — and every boundary to a third-party library is a thin adapter. That's why two people could
> build the halves independently and have the geometry match exactly."

> **2.** "I don't hand-write permutation tables and I don't re-implement the beginner's method. The
> move tables are generated from 3D geometry, and the teaching stages come from replaying the
> solver's own output against my engine and cutting where each stage predicate flips true."

> **3.** "You can't scramble a cube by shuffling characters — only 1 in 12 arrangements is legal.
> So I scramble from solved using random legal turns, which makes every generated state solvable
> by construction."
