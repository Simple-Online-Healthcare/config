import assert from "node:assert/strict";
import test from "node:test";

import { readStoredExperiments, writeStoredExperiments, EXPERIMENTS_STORAGE_KEY } from "../src/core/session.js";
import type { KeyValueStore } from "../src/core/types.js";

function memoryStore(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

test("persists evaluated experiments under the sessionStorage key", () => {
  const store = memoryStore();
  writeStoredExperiments(store, { "cro-032-gp-details": "variant-b" });

  assert.equal(
    store.getItem(EXPERIMENTS_STORAGE_KEY),
    JSON.stringify({ "cro-032-gp-details": "variant-b" })
  );
  assert.deepEqual(readStoredExperiments(store), { "cro-032-gp-details": "variant-b" });
});

test("ignores corrupt session payloads", () => {
  const store = memoryStore();
  store.setItem(EXPERIMENTS_STORAGE_KEY, "{");
  assert.deepEqual(readStoredExperiments(store), {});

  store.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(["variant-b"]));
  assert.deepEqual(readStoredExperiments(store), {});
});
