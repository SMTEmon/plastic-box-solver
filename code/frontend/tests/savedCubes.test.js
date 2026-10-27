import assert from "node:assert/strict";
import test from "node:test";
import { savedCubesApi } from "../src/lib/api.js";

test("savedCubesApi: exposes list, save, and delete methods", () => {
  assert.equal(typeof savedCubesApi.list, "function");
  assert.equal(typeof savedCubesApi.save, "function");
  assert.equal(typeof savedCubesApi.delete, "function");
});
