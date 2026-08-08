# Implementation Plan — Connecting the Two Halves

> Read `RUNNING_AND_UNDERSTANDING.md` first. This doc is what to code next, in order,
> with the actual code.
> Every file path here is real. Every backend behaviour cited was read out of the source.

---

## STATUS — updated after the integration round

**Phases 0, 1 and most of 2 are now built and committed.** What landed:

| | Delivered | Files |
|---|---|---|
| ✅ | Vite proxy for `/api` and `/health` | `vite.config.js` |
| ✅ | Shared cube engine, verified byte-identical to Python | `src/cube/{facelets,geometry,moves}.js` |
| ✅ | HTTP layer on native fetch (no axios needed) | `src/lib/api.js` |
| ✅ | Logical state: facelets, history, timer, undo/redo, assisted flag | `src/store/cubeStore.js` |
| ✅ | Animation engine **with a move queue** and X/Y/Z support | `src/cube/animate.js` |
| ✅ | Keyboard (FR-20) + on-screen turn controls; Leva removed | `src/Components/{KeyboardControls,MoveButtons}.jsx` |
| ✅ | Backend scramble, dual validation, live API status badge | `src/Pages/CubeInput.jsx`, `src/Layout/AppShell.jsx` |
| ✅ | Interactive / Guided / Auto-Solve with live time, moves, efficiency | `src/Pages/SolveWorkspace.jsx` |
| ✅ | Plain-English guided instructions + stage help + "play this stage" | `src/cube/notation.js` |
| ✅ | Orientation aids: in-scene face labels, reset view, live face/colour legend | `src/Three/CubeScene.jsx` |
| ✅ | **Camera scan UI** (FR-04/06a): webcam or upload, quality flags, result grid | `src/Pages/CameraScan.jsx` |
| ✅ | Test-image generator with a self-checking round trip | `code/backend/tools/make_test_faces.py` |
| ✅ | Test suites: parity, animator, visual parity, API contract | `tests/*.test.js` |

Verified: `npm test` → **20/20**, `npm run test:parity` → **5/5** against a live API,
`npx eslint src tests` → **clean**, `npm run build` → **succeeds**.

### One real bug found and fixed after the first integration round

Guided mode finished with the store reporting **solved** while the cube on screen was scrambled.
`MOVE_SPEC` in `animate.js` (how the scene physically spins) had the three whole-cube rotations
`X`/`Y`/`Z` inverted relative to `moves.js` (how the model says they permute). Face turns were
right; rotations were not, and beginner-method solutions are full of them.

`tests/visualParity.test.js` now rebuilds the permutation implied by `MOVE_SPEC` and asserts it
equals the model's, for all nine tokens. **Any hand-written table describing the same geometry as
a generated one needs a test tying them together** — that's the general lesson.

**Deliberately different from the plan below:** `api.js` uses the browser's native `fetch`
instead of axios. One less dependency, same interceptor behaviour written by hand. `zustand` was
installed as planned.

**What's next, in priority order:**

1. **Phase 3 — auth pages** (§ below). Blocks everything in Phase 4.
2. **Phase 4.1–4.3 — submit the solve, then the Dashboard and Leaderboard screens.** These
   endpoints already work; it's screen work, not logic.
3. **Phase 5.1 — the 2D net picker.** The camera half (5.2) is done; the correction editor is
   not, so a scan that comes back with two wrong stickers currently can't be fixed in the UI.
4. **Phase 6 — security items** (untrack `sql_app.db`, fail loudly on a missing `SECRET_KEY`,
   pin `requirements.txt`). Ten minutes, disproportionate marks.

Everything below is kept as the reference: Phases 0–2 for how the delivered code works and why,
Phases 3–6 as the plan for what's left.

---

## The order, and why it can't change

```
Phase 0  Foundations       ← BLOCKING. Nothing else can start.
Phase 1  Logical state     ← BLOCKING. Every remaining FR depends on this.
   │
   ├── Phase 2  Solve modes      (FR-09, 10, 11, 12)
   ├── Phase 3  Auth pages       (FR-01, 02, 22)
   ├── Phase 4  Dashboard/board  (FR-13, 14)
   └── Phase 5  Input UX         (FR-04, 05, 06c)
Phase 6  Cleanup + NFR     ← do the security items early, they're 10 minutes
```

Phases 2–5 are independent once 0 and 1 land, so two people can split them.

### The one sentence that explains why Phase 1 is blocking

`Buttons.jsx` mutates the Three.js scene graph directly — it re-parents cubelets into a
rotation group and animates. **Nothing anywhere records what the cube currently is.**

No logical state ⇒ no solved-detection ⇒ no honest move count ⇒ no efficiency ⇒ no solve to
submit ⇒ no history ⇒ no leaderboard entry. FR-09 through FR-14 are all downstream of this
one gap.

---

## Three constraints that will bite you

**A. The API boundary needs a format conversion.**
Frontend produces `{U:[...], R:[...], ...}` with **UPPERCASE** letters.
Backend expects a **lowercase** 54-char string in URFDLB order.
Same face order, same letters — different case and shape. One function each way.

**B. Solutions can contain whole-cube rotations, even in "optimal" mode.**
If `kociemba` isn't installed, `solve_optimal` falls through to `rubik_solver`, which emits
`X`/`Y`/`Z` tokens. Your current `Buttons.jsx` only knows 12 face turns.
**The animation engine must handle X/Y/Z or playback will crash on real data.**
Check which path you're on:
```bash
cd code/backend && source venv/bin/activate && python -c "import kociemba; print('kociemba present')"
```

**C. Login is form-encoded, not JSON.**
`POST /api/auth/register` → JSON.
`POST /api/auth/login` → `application/x-www-form-urlencoded`, and the field named
**`username` carries the EMAIL**. Sending JSON here fails.

---

# Phase 0 — Foundations

**Goal:** the frontend can talk to the backend, and both agree on what a cube is.
**Estimated: 3–4 hours.** Nothing else starts until the cross-check test passes.

## 0.1 Install dependencies

```bash
cd code/frontend
npm install axios zustand
```

Both are already named in your proposal; neither was ever installed.

## 0.2 Proxy `/api` to the backend

This is the simplest option — no CORS config, no env var, no hardcoded hostname anywhere.

**Edit `code/frontend/vite.config.js`:**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

Now `fetch("/api/cube/solve")` from the browser hits `localhost:8000/api/cube/solve`.
The backend's CORS middleware already allows `localhost:5173` anyway, but the proxy means
you never think about it again.

## 0.3 `src/cube/facelets.js` — the canonical format, mirrored

This file is the JS twin of `backend/app/cube/constants.py`. If you change one, change both.

**Create `code/frontend/src/cube/facelets.js`:**

```js
/**
 * Canonical cube format — the JS mirror of backend/app/cube/constants.py.
 *
 * facelets = 54-char string, 6 blocks of 9, in URFDLB order.
 * Each char is a LOWERCASE COLOUR letter (w r o y g b) — not a face letter.
 * index = face*9 + row*3 + col   (row top->bottom, col left->right, viewed from outside)
 *
 * The existing frontend "faces" shape ({U:[...], R:[...]} with UPPERCASE letters,
 * produced by lib/cubeInput.js) is kept as-is. These two functions bridge the two.
 */

export const FACE_ORDER = "URFDLB";

export const SOLVED =
  "w".repeat(9) + // U
  "r".repeat(9) + // R
  "g".repeat(9) + // F
  "y".repeat(9) + // D
  "o".repeat(9) + // L
  "b".repeat(9);  // B

/** {U:[...9 UPPERCASE], R:[...], ...}  ->  54-char lowercase facelet string */
export function facesToFacelets(faces) {
  let out = "";
  for (const f of FACE_ORDER) {
    const arr = faces[f];
    if (!arr || arr.length !== 9) throw new Error(`face ${f} must have 9 stickers`);
    out += arr.join("").toLowerCase();
  }
  return out;
}

/** 54-char lowercase facelet string  ->  {U:[...9 UPPERCASE], R:[...], ...} */
export function faceletsToFaces(facelets) {
  if (facelets.length !== 54) {
    throw new Error(`expected 54 stickers, got ${facelets.length}`);
  }
  const out = {};
  FACE_ORDER.split("").forEach((f, i) => {
    out[f] = facelets.slice(i * 9, i * 9 + 9).toUpperCase().split("");
  });
  return out;
}

export function isSolved(facelets) {
  return facelets === SOLVED;
}
```

> **Why lowercase is canonical and uppercase is the UI shape:** the backend is the source of
> truth for cube state, so the wire format wins. `mapToCubelets.js` and `Cubelet.jsx` already
> expect uppercase, and those files are correct — don't touch them.

## 0.4 `src/cube/geometry.js` — direct port of `moves.py:12–38`

**Create `code/frontend/src/cube/geometry.js`:**

```js
/**
 * Direct port of the GEOM / INDEX_OF construction in backend/app/cube/moves.py.
 *
 * This is what makes the frontend and backend agree on what "R" means. Both derive
 * their permutation tables from THIS layout instead of hand-writing 54-entry tables,
 * so they cannot silently disagree.
 */

export const FACES = "URFDLB";

// normal vector, and how (row, col) maps into a 3D slot position, per face
const LAYOUT = {
  U: { n: [0, 1, 0],  pos: (r, c) => [c - 1,  1,     r - 1] },
  R: { n: [1, 0, 0],  pos: (r, c) => [1,      1 - r, 1 - c] },
  F: { n: [0, 0, 1],  pos: (r, c) => [c - 1,  1 - r, 1] },
  D: { n: [0, -1, 0], pos: (r, c) => [c - 1, -1,     1 - r] },
  L: { n: [-1, 0, 0], pos: (r, c) => [-1,     1 - r, c - 1] },
  B: { n: [0, 0, -1], pos: (r, c) => [1 - c,  1 - r, -1] },
};

// GEOM[i] = { pos: [x,y,z], normal: [nx,ny,nz] } for i in 0..53
export const GEOM = [];
for (const f of FACES) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      GEOM.push({ pos: LAYOUT[f].pos(r, c), normal: LAYOUT[f].n });
    }
  }
}

export const key = (pos, normal) => `${pos.join(",")}|${normal.join(",")}`;

// (position, normal) -> sticker index
export const INDEX_OF = new Map(GEOM.map((g, i) => [key(g.pos, g.normal), i]));

export const AXIS  = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 }; // 0=x 1=y 2=z
export const LAYER = { U: 1, D: -1, R: 1, L: -1, F: 1, B: -1 };

/** Rotate a vector 90 degrees about `axis`. Mirrors _rot90 in moves.py exactly. */
export function rot90(v, axis, direction) {
  const [x, y, z] = v;
  if (axis === 0) return [x, -direction * z, direction * y];
  if (axis === 1) return [direction * z, y, -direction * x];
  return [-direction * y, direction * x, z];
}
```

> ⚠️ **Do not "improve" the rot90 signs or the LAYOUT table.** They are load-bearing and they
> already match the backend. I diffed `LAYOUT` against `mapToCubelets.js` sticker by sticker —
> the geometry agrees on all six faces. Any "cleanup" here breaks that agreement.

## 0.5 `src/cube/moves.js` — port of `PERMS`, `ROT_PERMS`, `applyMove`

**Create `code/frontend/src/cube/moves.js`:**

```js
/** Port of backend/app/cube/moves.py — permutations generated, not typed. */

import { FACES, GEOM, INDEX_OF, AXIS, LAYER, key, rot90 } from "./geometry.js";

/** perm[newIndex] = oldIndex, for a single layer turn */
function buildPermutation(face) {
  const axis = AXIS[face];
  const layer = LAYER[face];
  const direction = -layer;
  const perm = [...Array(54).keys()];
  GEOM.forEach((g, i) => {
    if (g.pos[axis] !== layer) return;            // only this layer moves
    const j = INDEX_OF.get(
      key(rot90(g.pos, axis, direction), rot90(g.normal, axis, direction)),
    );
    perm[j] = i;
  });
  return perm;
}

export const PERMS = Object.fromEntries(
  FACES.split("").map((f) => [f, buildPermutation(f)]),
);

// --- Whole-cube rotations X / Y / Z -----------------------------------------
// rubik_solver's beginner method emits these as "turn the cube in your hands".
// Same code as a face turn, but with NO layer filter — every sticker moves.
const ROT_AXIS = { X: 0, Y: 1, Z: 2 };
const ROT_DIR  = { X: 1, Y: 1, Z: 1 };

function buildRotation(letter) {
  const axis = ROT_AXIS[letter];
  const direction = ROT_DIR[letter];
  const perm = [...Array(54).keys()];
  GEOM.forEach((g, i) => {                         // ALL stickers
    const j = INDEX_OF.get(
      key(rot90(g.pos, axis, direction), rot90(g.normal, axis, direction)),
    );
    perm[j] = i;
  });
  return perm;
}

export const ROT_PERMS = Object.fromEntries(
  ["X", "Y", "Z"].map((l) => [l, buildRotation(l)]),
);

/** move is like "R", "R'", "R2", or a whole-cube rotation "X" / "Y'" / "Z2" */
export function applyMove(facelets, move) {
  const token = move[0];
  const table = ROT_PERMS[token] ?? PERMS[token];
  if (!table) throw new Error(`unknown move token: ${move}`);
  const times = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
  let out = facelets;
  for (let n = 0; n < times; n++) {
    out = table.map((src) => out[src]).join("");
  }
  return out;
}

export function applyMoves(facelets, moves) {
  return moves.reduce(applyMove, facelets);
}

export function invert(move) {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move[0];
  return move + "'";
}
```

## 0.6 `src/lib/api.js` — one axios instance

**Create `code/frontend/src/lib/api.js`:**

```js
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Attach the JWT to every request if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise FastAPI's error shapes into a plain message string.
// FastAPI returns 422 validation errors as detail:[{loc,msg,type}], but our own
// HTTPExceptions return detail:"a string". Handle both.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const d = error.response?.data?.detail;
    const message = Array.isArray(d)
      ? d.map((e) => e.msg).join("; ")
      : d || error.message || "Request failed";
    return Promise.reject(Object.assign(new Error(message), {
      status: error.response?.status,
    }));
  },
);

export default api;

// ---- Typed helpers. One place where every endpoint's shape is written down. ----

export const cubeApi = {
  scramble: (n = 20) =>
    api.post(`/cube/scramble?n_moves=${n}`).then((r) => r.data),
  //   -> { facelets, moves }

  validate: (facelets) =>
    api.post("/cube/validate", { facelets }).then((r) => r.data),
  //   -> { valid, detail? }   NOTE: returns 200 even when invalid

  solve: (facelets, method = "optimal") =>
    api.post("/cube/solve", { facelets, method }).then((r) => r.data),
  //   -> { moves, moveCount, stages:[{name,start,end}], optimalMoves, optimalMoveCount }
  //   -> throws with status 422 if the cube is illegal

  scan: (files) => {
    // exactly 6 files, URFDLB order, field name must be "images"
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return api.post("/cube/scan", fd).then((r) => r.data);
    //   -> { facelets, valid, detail?, faces:[{face,blurry,dark}] }
  },
};

export const authApi = {
  register: (email, password, display_name) =>
    api.post("/auth/register", { email, password, display_name }).then((r) => r.data),

  // ⚠️ form-encoded, and `username` carries the EMAIL. JSON here will fail.
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api
      .post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data); // -> { access_token, token_type }
  },

  profile: () => api.get("/profile").then((r) => r.data),
  updateProfile: (body) => api.patch("/profile", body).then((r) => r.data),
};

export const solvesApi = {
  create: (body) => api.post("/solves", body).then((r) => r.data),
  //   body: { solve_time, move_count, optimal_moves, method?, scramble?, solution? }
  history: () => api.get("/solves").then((r) => r.data),
  //   -> { solves: [...], personal_best: {...} | null }
};

export const leaderboardApi = {
  list: () => api.get("/leaderboard").then((r) => r.data),
  //   -> [{ rank, user_id, display_name, best_time, efficiency, is_me }]
};
```

## 0.7 ⭐ The cross-check test — the single most important test in the project

If this passes, your JS engine is byte-for-byte identical to the Python one, and everything
downstream is trustworthy. If it fails, **stop and fix it before writing another line.**

**Create `code/frontend/tests/engineParity.test.js`:**

```js
/**
 * Cross-checks the JS move engine against the live Python engine.
 * Requires the backend running on :8000.
 *
 *   cd code/backend && source venv/bin/activate && uvicorn app.main:app --port 8000
 *   cd code/frontend && node --test tests/engineParity.test.js
 */
import test from "node:test";
import assert from "node:assert";
import { applyMoves, applyMove, invert } from "../src/cube/moves.js";
import { SOLVED } from "../src/cube/facelets.js";

const API = "http://localhost:8000/api";

test("JS engine reproduces the backend's scramble exactly", async () => {
  for (let trial = 0; trial < 20; trial++) {
    const res = await fetch(`${API}/cube/scramble?n_moves=20`, { method: "POST" });
    const { facelets, moves } = await res.json();

    // Replay the backend's own move list through OUR engine, from solved.
    const mine = applyMoves(SOLVED, moves);

    assert.strictEqual(
      mine,
      facelets,
      `mismatch on [${moves.join(" ")}]\n  backend: ${facelets}\n  js     : ${mine}`,
    );
  }
});

test("JS engine replays the backend's solution to solved", async () => {
  for (const method of ["optimal", "beginner"]) {
    const s = await (await fetch(`${API}/cube/scramble?n_moves=20`, { method: "POST" })).json();
    const sol = await (
      await fetch(`${API}/cube/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facelets: s.facelets, method }),
      })
    ).json();

    assert.strictEqual(
      applyMoves(s.facelets, sol.moves),
      SOLVED,
      `${method} solution did not solve in the JS engine`,
    );
  }
});

test("algebraic invariants hold (no backend needed)", () => {
  for (const f of "URFDLB") {
    let s = SOLVED;
    for (let i = 0; i < 4; i++) s = applyMove(s, f);
    assert.strictEqual(s, SOLVED, `4x ${f} should be identity`);
    assert.strictEqual(applyMove(applyMove(SOLVED, f), invert(f)), SOLVED);
  }
  for (const r of "XYZ") {
    let s = SOLVED;
    for (let i = 0; i < 4; i++) s = applyMove(s, r);
    assert.strictEqual(s, SOLVED, `4x ${r} should be identity`);
  }
  // sexy move x6 = identity
  let s = SOLVED;
  for (let i = 0; i < 6; i++) s = applyMoves(s, ["R", "U", "R'", "U'"]);
  assert.strictEqual(s, SOLVED);
});
```

> ⚠️ `package.json` runs `node --test tests/*.test.js`, which would pick this file up and fail
> when the backend isn't running. Split the scripts:
> ```json
> "test":        "node --test tests/cubeInput.test.js",
> "test:parity": "node --test tests/engineParity.test.js"
> ```

### This port is already verified

I ran the exact code above against your real Python engine before writing it down:

```
PERM U: MATCH    PERM R: MATCH    PERM F: MATCH
PERM D: MATCH    PERM L: MATCH    PERM B: MATCH
ROT  X: MATCH    ROT  Y: MATCH    ROT  Z: MATCH
ALL PERMUTATION TABLES IDENTICAL

scramble replay parity: 30/30 match
sexy move x6 == solved: true
move + inverse identity: true for all 6 faces
U sends F top row to L: true
X2 == X X: true

facelets round trip (facesToFacelets ∘ faceletsToFaces): true
existing cubeInput.parseCubeString accepts the converted string: true
existing mapToCubelets.mapFacesToCubelets produces 26 cubelets: true
```

All nine permutation tables are **byte-identical** to `moves.py`, and the new files interoperate
with your existing `cubeInput.js` and `mapToCubelets.js` without changing either. So if the
parity test fails on your machine, it's a typo in transcription, not a design problem — diff
against this doc.

**Phase 0 is done when this file passes.** Take a screenshot of the output — it belongs in
your presentation.

---

# Phase 1 — Logical state + a real animation engine

**Goal:** the cube knows what it is at all times, and can play back a queued list of moves.
**Estimated: 5–6 hours.** This is the hardest phase. Budget accordingly.

## 1.1 `src/store/cubeStore.js` — the single source of truth

**Create `code/frontend/src/store/cubeStore.js`:**

```js
import { create } from "zustand";
import { applyMove } from "../cube/moves.js";
import { SOLVED, isSolved } from "../cube/facelets.js";

export const useCubeStore = create((set, get) => ({
  // --- state ---
  initial: SOLVED,       // the scramble we started from (needed to POST the solve)
  facelets: SOLVED,      // current logical state — the truth
  history: [],           // moves the USER made (excludes assisted playback)
  redoStack: [],         // FR-18
  startedAt: null,       // ms timestamp of the first user move
  finishedAt: null,
  assisted: false,       // FR-12b: did they use guided or auto-solve this session?
  optimalMoveCount: 0,   // efficiency denominator, from /api/cube/solve

  // --- actions ---
  loadScramble: (facelets, optimalMoveCount = 0) =>
    set({
      initial: facelets,
      facelets,
      history: [],
      redoStack: [],
      startedAt: null,
      finishedAt: null,
      assisted: false,
      optimalMoveCount,
    }),

  /** Advance logical state. countIt=false for assisted playback moves. */
  applyMove: (move, countIt = true) =>
    set((s) => {
      const next = applyMove(s.facelets, move);
      const solved = isSolved(next);
      return {
        facelets: next,
        history: countIt ? [...s.history, move] : s.history,
        redoStack: countIt ? [] : s.redoStack,
        startedAt: s.startedAt ?? (countIt ? Date.now() : null),
        finishedAt: solved && s.startedAt ? Date.now() : s.finishedAt,
      };
    }),

  markAssisted: () => set({ assisted: true }),   // permanent for the session

  // FR-18 — undo/redo. Note these mutate logical state; the scene must resync.
  undo: () => {
    const { history, facelets } = get();
    if (!history.length) return null;
    const last = history[history.length - 1];
    const inverse = last.endsWith("2") ? last : last.endsWith("'") ? last[0] : last + "'";
    set({
      facelets: applyMove(facelets, inverse),
      history: history.slice(0, -1),
      redoStack: [...get().redoStack, last],
    });
    return inverse;      // caller animates this
  },

  redo: () => {
    const { redoStack, facelets, history } = get();
    if (!redoStack.length) return null;
    const move = redoStack[redoStack.length - 1];
    set({
      facelets: applyMove(facelets, move),
      history: [...history, move],
      redoStack: redoStack.slice(0, -1),
    });
    return move;
  },

  // --- derived ---
  elapsedSeconds: () => {
    const { startedAt, finishedAt } = get();
    if (!startedAt) return 0;
    return ((finishedAt ?? Date.now()) - startedAt) / 1000;
  },

  efficiency: () => {
    const { optimalMoveCount, history } = get();
    if (!history.length) return 0;
    return Math.min(100, (optimalMoveCount / history.length) * 100);
  },

  isSolved: () => isSolved(get().facelets),
}));
```

> **Design note worth saying out loud:** `efficiency()` here is only for the live UI display.
> The number that gets stored is computed **server-side** in `routers/solves.py`. The client
> never duplicates the formula — the DB is the single source of truth.

## 1.2 `src/cube/animate.js` — the animation engine, with a queue

Lift the three functions out of `Buttons.jsx` and add the two things it's missing:
**a queue** (the current code silently drops moves while an animation is in flight — fatal for
playing a 20-move solution) and **whole-cube rotations**.

**Create `code/frontend/src/cube/animate.js`:**

```js
import JEASINGS, { JEasing } from "jeasings";

/**
 * token -> which cubelets move, about which axis, in which direction.
 *
 * These six face entries are lifted verbatim from the working Buttons.jsx, so
 * they are already visually calibrated. `limit` selects the layer:
 *   limit > 0  -> cubelets with position[axis] >  limit
 *   limit < 0  -> cubelets with position[axis] <  limit
 * `sign` is the direction of a CLOCKWISE turn viewed from outside that face.
 */
export const MOVE_SPEC = {
  U: { axis: "y", limit:  0.5, sign: -1 },
  D: { axis: "y", limit: -0.5, sign:  1 },
  R: { axis: "x", limit:  0.5, sign: -1 },
  L: { axis: "x", limit: -0.5, sign:  1 },
  F: { axis: "z", limit:  0.5, sign: -1 },
  B: { axis: "z", limit: -0.5, sign:  1 },
  // Whole-cube rotations: limit === null means "attach EVERY cubelet".
  // ⚠️ These three signs must be verified empirically — see §1.3.
  X: { axis: "x", limit: null, sign: -1 },
  Y: { axis: "y", limit: null, sign: -1 },
  Z: { axis: "z", limit: null, sign: -1 },
};

const DURATION_MS = 220;

function reparentBack(cubeGroup, rotationGroup) {
  rotationGroup.children.slice().reverse().forEach((c) => cubeGroup.attach(c));
  rotationGroup.quaternion.set(0, 0, 0, 1);
  rotationGroup.rotation.set(0, 0, 0);
}

function attachLayer(cubeGroup, rotationGroup, axis, limit) {
  cubeGroup.children
    .slice()
    .reverse()
    .filter((c) => (limit === null ? true : limit < 0 ? c.position[axis] < limit : c.position[axis] > limit))
    .forEach((c) => rotationGroup.attach(c));
}

/**
 * Creates an animator bound to a cubeGroup + rotationGroup ref pair.
 * onMoveDone(move) fires when each animation completes — that's where you
 * advance the logical store, so render and truth can never drift.
 */
export function createAnimator({ cubeGroup, rotationGroup, onMoveDone }) {
  const queue = [];
  let busy = false;

  function runNext() {
    if (busy || queue.length === 0) return;
    const move = queue.shift();
    const spec = MOVE_SPEC[move[0]];
    if (!spec) {
      console.warn("unknown move token:", move);
      return runNext();
    }
    const quarters = move.endsWith("2") ? 2 : 1;
    const dir = move.endsWith("'") ? -spec.sign : spec.sign;

    busy = true;
    reparentBack(cubeGroup.current, rotationGroup.current);
    attachLayer(cubeGroup.current, rotationGroup.current, spec.axis, spec.limit);

    new JEasing(rotationGroup.current.rotation)
      .to(
        {
          [spec.axis]:
            rotationGroup.current.rotation[spec.axis] + (Math.PI / 2) * quarters * dir,
        },
        DURATION_MS * quarters,
      )
      .easing(JEASINGS.Cubic.InOut)
      .onComplete(() => {
        reparentBack(cubeGroup.current, rotationGroup.current);
        busy = false;
        onMoveDone?.(move);      // <-- logical state advances HERE
        runNext();               // <-- drain the rest of the queue
      })
      .start();
  }

  return {
    /** Queue one move or an array of moves. Nothing is ever dropped. */
    enqueue(moves) {
      (Array.isArray(moves) ? moves : [moves]).forEach((m) => queue.push(m));
      runNext();
    },
    clear() { queue.length = 0; },
    get pending() { return queue.length + (busy ? 1 : 0); },
  };
}
```

## 1.3 Calibrating the X / Y / Z animation signs (do not skip)

The **logical** permutations for X/Y/Z are already provably correct — the Phase 0 parity test
proves it. But whether the **visual** rotation spins the same way is a separate question that
the port can't answer, because `ROT_DIR` in `moves.py` uses `+1` while a face turn uses
`-layer`. Verify it in five minutes rather than guessing:

1. Load a scrambled cube so every face looks different.
2. In the browser console, note the top-centre sticker colour.
3. Fire `animator.enqueue("Y")` and watch which way it spins.
4. Compare against `applyMove(facelets, "Y")` — check whether the sticker that ends up at the
   **front-centre** position matches index 22 of the logical result.
5. If they disagree, flip `sign` for that letter in `MOVE_SPEC`. Only three signs to check.

Write down which way each one went — "how did you verify the animation matches the model?" is
a very likely question.

## 1.4 Replace `Buttons.jsx` with a real control surface

Delete the Leva panel. It's a debug tool, and shipping a debug panel as the UI reads badly.

**Replace `code/frontend/src/Components/Buttons.jsx`:**

```js
import { useEffect } from "react";

const FACE_KEYS = { u: "U", d: "D", l: "L", r: "R", f: "F", b: "B" };

/**
 * FR-20: U D L R F B = clockwise. Shift = counter-clockwise (prime).
 * Hold 2 (or press 2 then the key) for a double turn.
 */
export default function KeyboardControls({ onMove, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    let doubleArmed = false;

    const onKey = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

      if (e.key === "2") { doubleArmed = true; return; }

      const face = FACE_KEYS[e.key.toLowerCase()];
      if (!face) return;
      e.preventDefault();

      const suffix = doubleArmed ? "2" : e.shiftKey ? "'" : "";
      doubleArmed = false;
      onMove(face + suffix);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove, enabled]);

  return null;
}
```

And an on-screen button grid, because keyboard-only fails the mobile NFR:

**Create `code/frontend/src/Components/MoveButtons.jsx`:**

```js
const FACES = ["U", "D", "L", "R", "F", "B"];

export default function MoveButtons({ onMove, disabled }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {FACES.map((f) => (
        <div key={f} className="flex flex-col gap-1">
          <button
            disabled={disabled}
            onClick={() => onMove(f)}
            className="py-2 rounded-lg border border-dark-border bg-dark-surface text-white text-sm font-mono hover:border-neon-blue disabled:opacity-40"
          >
            {f}
          </button>
          <button
            disabled={disabled}
            onClick={() => onMove(f + "'")}
            className="py-2 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-sm font-mono hover:border-neon-blue disabled:opacity-40"
          >
            {f}'
          </button>
        </div>
      ))}
    </div>
  );
}
```

Then in `styles.css`, delete the now-dead `#leva__root` override, and
`npm uninstall leva`.

## 1.5 Wire the animator into `Cube.jsx`

`Cube.jsx` currently derives `stickersMap` from a prop on every render. Change it to read
`facelets` from the store, so the render follows the truth automatically:

```js
// inside Cube.jsx
import { useCubeStore } from "../store/cubeStore.js";
import { faceletsToFaces } from "../cube/facelets.js";

const facelets = useCubeStore((s) => s.facelets);
const stickersMap = useMemo(
  () => mapFacesToCubelets(faceletsToFaces(facelets)),
  [facelets],
);
```

Expose the animator upward with a `ref` or a callback prop so `SolveWorkspace` can queue
solution playback into it.

> **The invariant to protect:** the store is advanced **only** in `onMoveDone`, i.e. when the
> animation finishes. Never advance it when the move is *requested*. If you advance on request,
> the re-render swaps sticker colours mid-spin and the cube visibly glitches.

**Phase 1 is done when:** you can press `R U R' U'` six times on the keyboard and the cube
returns to solved, both visually and per `useCubeStore.getState().isSolved()`.

---

# Phase 2 — The three solve modes (FR-09, FR-10, FR-11, FR-12)

**Estimated: 6–8 hours.**

Add a mode picker to `SolveWorkspace` plus a live sidebar showing time / moves / efficiency.

| Mode | Backend call | Behaviour |
|---|---|---|
| **Interactive** | none during the solve | Timer + move counter run live. On `isSolved()` → results panel. Efficiency counts. |
| **Guided** | `POST /api/cube/solve {method:"beginner"}` | Stage list in the sidebar from `stages[]`; step forward/back one move; highlight the current stage |
| **Auto-Solve** | `POST /api/cube/solve {method:"optimal"}` | Queue every move into the animator and play |

## 2.1 Fetch the solution once, on entry

You need `optimalMoveCount` for the efficiency denominator **even in Interactive mode** — so
call `/api/cube/solve` with `method: "optimal"` as soon as a cube is loaded, regardless of mode,
and stash the count in the store.

```js
const data = await cubeApi.solve(facelets, "optimal");
useCubeStore.getState().loadScramble(facelets, data.optimalMoveCount);
```

## 2.2 The assisted flag

Switching to Guided or Auto-Solve sets `assisted = true` **permanently for that session**.
Show a confirmation first:

> *"Using a system solve means this attempt won't count toward your efficiency or the
> leaderboard. Continue?"*

Once set, it never clears until a new scramble is loaded, and the completed solve is **not**
submitted to `/api/solves`. This is what keeps the leaderboard honest, and it's a good thing
to point at in the demo.

## 2.3 Guided-mode stage sidebar

The `/solve` response gives you everything:

```json
{
  "moves": ["D", "R'", "F2", "..."],
  "moveCount": 87,
  "stages": [
    {"name": "Bottom cross", "start": 0,  "end": 12},
    {"name": "Bottom layer", "start": 12, "end": 31},
    {"name": "Middle layer", "start": 31, "end": 50},
    ...
  ],
  "optimalMoves": ["..."],
  "optimalMoveCount": 20
}
```

`moves[stage.start : stage.end]` is exactly the moves that complete that stage. So the current
stage is:

```js
const currentStage = stages.find((s) => cursor >= s.start && cursor < s.end);
const progressInStage = (cursor - currentStage.start) / (currentStage.end - currentStage.start);
```

Stepping backwards means animating `invert(moves[cursor - 1])`.

## 2.4 Error handling — two different shapes

```js
try {
  const data = await cubeApi.solve(facelets, method);
} catch (err) {
  if (err.status === 422) {
    // illegal cube — /solve rejects with 422
    setError(err.message);   // already normalised by the interceptor
  } else {
    setError("Could not reach the solver. Is the backend running?");
  }
}
```

Remember `/validate` is the opposite: **200 with `{valid: false}`**. Handle both.

---

# Phase 3 — Auth pages (FR-01, FR-02, FR-22)

**Estimated: 3–4 hours.**

## 3.1 `src/store/authStore.js`

```js
import { create } from "zustand";
import { authApi } from "../lib/api.js";

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("token"),
  user: null,

  login: async (email, password) => {
    const { access_token } = await authApi.login(email, password);
    localStorage.setItem("token", access_token);
    set({ token: access_token });
    const user = await authApi.profile();
    set({ user });
    return user;
  },

  register: (email, password, display_name) =>
    authApi.register(email, password, display_name),

  loadUser: async () => {
    if (!localStorage.getItem("token")) return null;
    try {
      const user = await authApi.profile();
      set({ user });
      return user;
    } catch {
      localStorage.removeItem("token");   // expired token (30 min TTL)
      set({ token: null, user: null });
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
}));
```

## 3.2 Pages + protected routes

New `src/Pages/Login.jsx` and `src/Pages/Register.jsx`.
**Client-side validation must mirror the backend** or the error messages will surprise users:

- password ≥ 8 characters (backend: `Field(..., min_length=8)`, returns **422**)
- duplicate email → backend returns **400 "Email already registered"**
- duplicate display name → **400 "Display name taken"**
- `display_name` is optional; the backend defaults it to the email local-part

**Update `Router.jsx`** — it currently has **no `path="*"` catch-all**, so an unknown URL
renders a blank white page:

```jsx
function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

// ...
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
<Route path="/leaderboard" element={<Leaderboard />} />   {/* public — get_optional_user */}
<Route path="*" element={<Navigate to="/cube-input" replace />} />
```

Note the leaderboard is deliberately **not** wrapped — the backend uses `get_optional_user`
precisely so it's viewable logged-out and personalised when logged in.

## 3.3 Wire the dead Logout button

`AppShell.jsx:46` has a Logout button that does nothing. `onClick={() => { logout(); navigate("/login"); }}`.
That's FR-22, and it's a two-line fix.

---

# Phase 4 — Dashboard, leaderboard, saved cubes (FR-13, FR-14)

**Estimated: 4–5 hours.** Mostly wiring — these endpoints already work.

## 4.1 Submit a completed solve

On a completed **Interactive** solve where `assisted === false`:

```js
await solvesApi.create({
  solve_time: useCubeStore.getState().elapsedSeconds(),
  move_count: useCubeStore.getState().history.length,
  optimal_moves: useCubeStore.getState().optimalMoveCount,
  method: "Interactive",
  scramble: useCubeStore.getState().initial,
  solution: useCubeStore.getState().history.join(" "),
});
```

Send raw numbers. **Do not compute efficiency client-side and send it** — the server computes
it in `_efficiency()`.

## 4.2 Dashboard

`GET /api/solves` → `{ solves: [...], personal_best: {...} | null }`.
**Handle `personal_best: null` as an empty state, not an error** — a new user has no solves and
that's normal. Render "Complete your first solve to set a personal best."

## 4.3 Leaderboard

`GET /api/leaderboard` → `[{ rank, user_id, display_name, best_time, efficiency, is_me }]`.
Use the existing `is_me` flag to highlight the row — the backend already computed it, don't
compare IDs yourself.

## 4.4 New backend work — saved cubes

Your requirement that a scanned cube survives a closed tab or a device switch has **no backend
support today**. There's no table for it. Add:

**In `code/backend/app/db/models.py`:**

```python
class SavedCube(Base):
    __tablename__ = "saved_cubes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    facelets = Column(String)                    # 54-char canonical
    label = Column(String, nullable=True)
    source = Column(String, default="manual")    # "scan" | "manual"
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User")
```

**Create `code/backend/app/routers/cubes.py`** with `POST /api/cubes`, `GET /api/cubes`,
`DELETE /api/cubes/{id}`, all `Depends(get_current_user)`. Register it in `main.py`.

⚠️ **`create_all()` does not ALTER existing tables.** Adding this model to an existing
`sql_app.db` silently does nothing. Either `rm sql_app.db` (you'll lose your test data) or add
Alembic. For a class project, deleting is fine — just don't discover this live on stage.

Also mirror to `localStorage` so logged-out users get tab-close resilience too.

---

# Phase 5 — Input UX (FR-04, FR-05, FR-06c)

**Estimated: 5–6 hours.**

## 5.1 2D net colour picker (FR-05, FR-06c)

Replace the textarea as the *primary* input with 54 clickable squares laid out as an unfolded
cross. Keep the textarea as an "advanced / paste" option — it's genuinely useful for demos.

```
        [U 3x3]
[L 3x3] [F 3x3] [R 3x3] [B 3x3]
        [D 3x3]
```

Palette of 6 colours; click a colour, then click stickers to paint. Centres should be
**locked** — they define the colour scheme and a user changing them is always a mistake.
Feed the result through the same `parseCubeString` path so validation stays in one place.

## 5.2 Camera scan (FR-04, FR-06a)

`POST /api/cube/scan`, `multipart/form-data`, field name `images`, **exactly 6 files in URFDLB
order**. Anything else → 422.

The correction loop is the whole point, and the endpoint was built for it:

```js
const { facelets, valid, detail, faces } = await cubeApi.scan(files);

// The endpoint returns detected facelets EVEN WHEN INVALID — on purpose.
setNetState(faceletsToFaces(facelets));   // drop it into the 2D editor either way

if (!valid) setBanner(detail);            // e.g. "colour 'r' appears 10x, need exactly 9"

faces.filter((f) => f.blurry || f.dark)
     .forEach((f) => flagFace(f.face, f.blurry ? "too blurry" : "too dark"));
```

So the user fixes 2 stickers by hand instead of typing all 54. That's the design intent stated
in `routers/cube.py` and it's worth saying in the demo.

**Getting the six images:** `getUserMedia` → `<video>` → draw a frame to a `<canvas>` →
`canvas.toBlob()`. Prompt for one face at a time with an on-screen guide box, in URFDLB order.
Check `.github/vision guide.md` §5 for the required holding orientation of each face — getting
that wrong produces a valid-looking but wrong cube, which is the worst failure mode.

---

# Phase 6 — Cleanup and NFRs

## 6.1 Security — do these first, they're 10 minutes total

```bash
cd ~/Desktop/plastic-box-solver
git rm --cached code/backend/sql_app.db
echo "sql_app.db" >> code/backend/.gitignore
git commit -m "chore: untrack the sqlite database"
```

**Make a missing `SECRET_KEY` fail loudly outside dev.** In `app/utils/auth_utils.py`:

```python
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("ENV", "dev") == "dev":
        SECRET_KEY = "dev-only-insecure-key"
    else:
        raise RuntimeError("SECRET_KEY must be set outside development")
```

**Pin `requirements.txt`.** It's fully unpinned right now, which is exactly how the kociemba
build broke:

```bash
cd code/backend && source venv/bin/activate && pip freeze > requirements.txt
```

## 6.2 Fix the false-positive test

`tests/cubeInput.test.js` → `"throws on invalid opposite centers"` never reaches the branch it
claims to test. Its fixture has R×11 and G×7, so the **colour-count** check throws first, and
`assert.throws` has no error matcher so it passes anyway.

Fix: give the fixture a legal colour count (exactly 9 of each) with only the *centres* wrong,
and add a matcher:

```js
assert.throws(() => parseCubeString(badCenters), /opposite centers/i);
```

Add matchers to the other `assert.throws` calls in that file too, for the same reason.

## 6.3 Backend HTTP tests

There are currently **none**. The four files in `tests/` are bare assert scripts — no
`TestClient`, no router coverage. Add:

```python
# code/backend/tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/health").json() == {"status": "ok"}

def test_scramble_is_solvable():
    r = client.post("/api/cube/scramble?n_moves=20").json()
    assert len(r["facelets"]) == 54
    assert client.post("/api/cube/validate", json={"facelets": r["facelets"]}).json()["valid"]

def test_solve_rejects_illegal_cube():
    assert client.post("/api/cube/solve", json={"facelets": "w" * 54}).status_code == 422

def test_register_rejects_short_password():
    r = client.post("/api/auth/register", json={"email": "a@b.com", "password": "short"})
    assert r.status_code == 422

def test_login_flow_and_protected_route():
    client.post("/api/auth/register", json={"email": "t@t.com", "password": "password123"})
    tok = client.post(
        "/api/auth/login", data={"username": "t@t.com", "password": "password123"}
    ).json()["access_token"]
    me = client.get("/api/profile", headers={"Authorization": f"Bearer {tok}"})
    assert me.json()["email"] == "t@t.com"

def test_leaderboard_is_public():
    assert client.get("/api/leaderboard").status_code == 200
```

```bash
pip install pytest httpx
pytest tests/test_api.py -v
```

⚠️ Point `DATABASE_URL` at a temp file for tests, or they'll write into your real `sql_app.db`.

## 6.4 Responsive to 360px

The SRS requires it. `AppShell.jsx` is a fixed 230px sidebar inside `h-screen overflow-hidden` —
at 360px the content area gets 130px. Needs:

- a collapsible drawer below `md:` (hamburger toggle, sidebar as an overlay)
- the 3D canvas on a fluid height instead of `h-[520px]`
- the `/cube-input` two-column layout stacking to one column

## 6.5 Small things

- `__init__.py` in `app/db/` and `app/utils/` — they're currently implicit namespace packages
- Commit `build guide.md` into `docs/` — `solver.py` and `stages.py` cite it by section number
  and it isn't in the repo
- Fix `README.md`: `code/frontend`, not `code`
- Remove the `alert("Later: create new solve")` in `AppShell.jsx`

---

# Milestones you can put on a slide

| # | Milestone | Definition of done | Est. |
|---|---|---|---|
| M1 | **Shared engine** | `engineParity.test.js` passes against the live backend | 4h |
| M2 | **Logical state** | `R U R' U'` ×6 returns to solved, visually and per `isSolved()` | 6h |
| M3 | **Auto-solve** | Enter a scramble → click Auto-Solve → cube animates to solved | 4h |
| M4 | **Guided mode** | 7 stage segments in the sidebar, step forward/back, ends solved | 5h |
| M5 | **Auth** | Register → login → protected dashboard, token survives refresh | 4h |
| M6 | **Full loop** | Unassisted solve appears on Dashboard *and* Leaderboard | 5h |
| M7 | **Camera** | 6 photos → detected cube → correct 2 stickers in the net → solve | 6h |

**M1 and M2 are ~10 hours and they unblock literally everything else.** If you only have one
weekend before the next review, do those two and demo M3. A working auto-solve animation is the
single most convincing thing you can put on a screen.

---

# The one thing to get right

Everything in this plan reduces to one invariant:

> **The store's `facelets` string is the truth. The 3D scene is a rendering of it. The backend
> is the authority on what a legal cube is and how to solve it.**

Every bug you'll hit in Phases 2–5 will be a place where those three drifted apart. If you keep
the store advancing **only** in `onMoveDone`, and you keep `Cube.jsx` deriving its stickers
**only** from the store, they can't drift.
