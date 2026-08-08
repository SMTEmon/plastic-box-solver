/**
 * Pins the exact request shapes the backend expects. No server needed --
 * fetch is stubbed and the outgoing request is inspected.
 *
 * These are the details that produce a confusing 422 rather than a clear
 * error when you get them wrong:
 *   - /cube/scan wants multipart with the field name "images", six of them,
 *     in URFDLB order
 *   - /auth/login is form-encoded, and `username` carries the EMAIL
 *   - FastAPI reports pydantic errors as detail:[{msg}], not detail:"string"
 */

import test from "node:test";
import assert from "node:assert";

import { cubeApi, authApi, solvesApi, ApiError } from "../src/lib/api.js";

/** Capture the next fetch call and answer it with `response`. */
function stubFetch(response = { ok: true, status: 200, body: {} }) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status,
      text: async () => JSON.stringify(response.body),
    };
  };
  return calls;
}

test("scan posts six files under the field name 'images', in URFDLB order", async () => {
  const calls = stubFetch({ ok: true, status: 200, body: { facelets: "w".repeat(54) } });
  const files = ["U", "R", "F", "D", "L", "B"].map(
    (k) => new File([new Uint8Array([1, 2, 3])], `${k}.jpg`, { type: "image/jpeg" }),
  );

  await cubeApi.scan(files);

  const { url, init } = calls[0];
  assert.strictEqual(url, "/api/cube/scan");
  assert.strictEqual(init.method, "POST");
  assert.ok(init.body instanceof FormData, "must be multipart FormData");

  const entries = init.body.getAll("images");
  assert.strictEqual(entries.length, 6, "backend requires exactly six images");
  assert.deepStrictEqual(
    entries.map((f) => f.name),
    ["U.jpg", "R.jpg", "F.jpg", "D.jpg", "L.jpg", "B.jpg"],
    "order must be URFDLB",
  );
  // The browser sets the multipart boundary; we must not set it ourselves.
  assert.ok(!init.headers["Content-Type"]);
});

test("login is form-encoded with the email in the username field", async () => {
  const calls = stubFetch({ ok: true, status: 200, body: { access_token: "t" } });

  await authApi.login("someone@example.com", "password123");

  const { url, init } = calls[0];
  assert.strictEqual(url, "/api/auth/login");
  assert.strictEqual(
    init.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  );
  const parsed = new URLSearchParams(init.body);
  assert.strictEqual(parsed.get("username"), "someone@example.com");
  assert.strictEqual(parsed.get("password"), "password123");
});

test("register and solve send JSON", async () => {
  let calls = stubFetch({ ok: true, status: 200, body: {} });
  await authApi.register("a@b.com", "password123", "sam");
  assert.strictEqual(calls[0].init.headers["Content-Type"], "application/json");
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), {
    email: "a@b.com",
    password: "password123",
    display_name: "sam",
  });

  calls = stubFetch({ ok: true, status: 200, body: {} });
  await cubeApi.solve("w".repeat(54), "beginner");
  assert.deepStrictEqual(JSON.parse(calls[0].init.body), {
    facelets: "w".repeat(54),
    method: "beginner",
  });
});

test("pydantic 422 arrays are flattened into one message", async () => {
  stubFetch({
    ok: false,
    status: 422,
    body: {
      detail: [
        { loc: ["body", "password"], msg: "String should have at least 8 characters" },
        { loc: ["body", "email"], msg: "value is not a valid email address" },
      ],
    },
  });

  await assert.rejects(
    () => authApi.register("nope", "short"),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.status, 422);
      assert.match(err.message, /at least 8 characters/);
      assert.match(err.message, /valid email address/);
      return true;
    },
  );
});

test("string detail errors pass through unchanged", async () => {
  stubFetch({ ok: false, status: 400, body: { detail: "Email already registered" } });
  await assert.rejects(
    () => authApi.register("a@b.com", "password123"),
    (err) => err.message === "Email already registered" && err.status === 400,
  );
});

test("a dead backend gives an actionable message, not a stack trace", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => solvesApi.history(),
    (err) => err.status === 0 && /Is it running on port 8000/.test(err.message),
  );
});
