import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageUrl = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(readFileSync(packageUrl, "utf8"));

test("uses a portable single-process test command", () => {
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.scripts.test, "node tests/run-tests.js");
  assert.doesNotMatch(packageJson.scripts.test, /test-isolation/);
  assert.equal(packageJson.engines.node, ">=18.8.0");
});
