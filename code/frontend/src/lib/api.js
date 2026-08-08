/**
 * The single place the frontend talks to the backend.
 *
 * Every call goes to a relative "/api/..." URL. Vite's dev server proxies that
 * to http://localhost:8000 (see vite.config.js), so the backend host appears
 * nowhere in the source and CORS never comes up.
 *
 * Built on the browser's native fetch -- no HTTP dependency to install or
 * keep in sync.
 */

const BASE = "/api";

/** Error carrying the HTTP status, so callers can branch on 422 vs 500. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * FastAPI returns errors in two different shapes:
 *   - our own HTTPExceptions ->  { detail: "a string" }
 *   - pydantic validation    ->  { detail: [{loc, msg, type}, ...] }
 * Flatten both into one message.
 */
function normaliseDetail(body, fallback) {
  const d = body?.detail;
  if (Array.isArray(d)) return d.map((e) => e.msg).join("; ");
  if (typeof d === "string") return d;
  return fallback;
}

/** localStorage is absent outside the browser (e.g. the Node test runner). */
function storedToken() {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("token");
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", json, form, raw } = {}) {
  const headers = {};
  const token = storedToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  } else if (raw !== undefined) {
    body = raw; // FormData -- let the browser set the multipart boundary
  }

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body });
  } catch {
    // fetch only rejects on a network-level failure
    throw new ApiError(
      "Cannot reach the backend. Is it running on port 8000?",
      0,
    );
  }

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(
      normaliseDetail(payload, `Request failed (${res.status})`),
      res.status,
    );
  }
  return payload;
}

// --- Cube -------------------------------------------------------------------

export const cubeApi = {
  /** -> { facelets, moves } -- guaranteed solvable, generated from solved. */
  scramble: (nMoves = 20) =>
    request(`/cube/scramble?n_moves=${nMoves}`, { method: "POST" }),

  /**
   * -> { valid, detail? }
   * NOTE: returns HTTP 200 even when the cube is illegal. A rejection is a
   * normal answer here, not an error. /cube/solve is the opposite (422).
   */
  validate: (facelets) =>
    request("/cube/validate", { method: "POST", json: { facelets } }),

  /**
   * -> { moves, moveCount, stages:[{name,start,end}],
   *      optimalMoves, optimalMoveCount }
   * Throws ApiError with status 422 if the cube is not solvable.
   */
  solve: (facelets, method = "optimal") =>
    request("/cube/solve", { method: "POST", json: { facelets, method } }),

  /**
   * Six face photos in URFDLB order, field name "images".
   * -> { facelets, valid, detail?, faces:[{face,blurry,dark}] }
   * Returns the detected facelets EVEN WHEN INVALID, on purpose, so the UI can
   * drop it into the net editor and flag which faces to re-shoot.
   */
  scan: (files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return request("/cube/scan", { method: "POST", raw: fd });
  },
};

// --- Auth -------------------------------------------------------------------

export const authApi = {
  register: (email, password, display_name) =>
    request("/auth/register", {
      method: "POST",
      json: { email, password, display_name },
    }),

  /**
   * The backend uses FastAPI's OAuth2PasswordRequestForm, so this endpoint is
   * FORM-ENCODED (not JSON) and the field named `username` carries the EMAIL.
   * Sending JSON here fails.
   */
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      form: { username: email, password },
    }),

  profile: () => request("/profile"),
  updateProfile: (body) => request("/profile", { method: "PATCH", json: body }),
};

// --- Solves + leaderboard ---------------------------------------------------

export const solvesApi = {
  /**
   * body: { solve_time, move_count, optimal_moves, method?, scramble?, solution? }
   * Send raw numbers only -- efficiency is computed server-side so the DB
   * stays the single source of truth.
   */
  create: (body) => request("/solves", { method: "POST", json: body }),

  /** -> { solves: [...], personal_best: {...} | null } */
  history: () => request("/solves"),
};

export const leaderboardApi = {
  /** -> [{ rank, user_id, display_name, best_time, efficiency, is_me }] */
  list: () => request("/leaderboard"),
};

/** Cheap liveness probe used by the connection badge in the UI. */
export async function ping() {
  try {
    const res = await fetch("/health");
    return res.ok;
  } catch {
    return false;
  }
}
