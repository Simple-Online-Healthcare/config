import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeExperimentTier,
  productionDowngradeMessage,
  resolveExperimentTierForHost,
} from "../src/core/environment.js";

test("maps the three explicit tiers", () => {
  assert.equal(normalizeExperimentTier("production"), "production");
  assert.equal(normalizeExperimentTier(" Staging "), "staging");
  assert.equal(normalizeExperimentTier("DEVELOPMENT"), "development");
});

test("unknown, empty, and missing tiers become development", () => {
  assert.equal(normalizeExperimentTier("preview"), "development");
  assert.equal(normalizeExperimentTier("prod"), "development");
  assert.equal(normalizeExperimentTier("test"), "development");
  assert.equal(normalizeExperimentTier(""), "development");
  assert.equal(normalizeExperimentTier("   "), "development");
  assert.equal(normalizeExperimentTier(undefined), "development");
  assert.equal(normalizeExperimentTier(null), "development");
});

test("keeps production on an allowlisted host", () => {
  const logs: string[] = [];
  const resolved = resolveExperimentTierForHost({
    environment: "production",
    hostname: "www.simpleonlinepharmacy.co.uk",
    logger: (message) => logs.push(message),
  });

  assert.deepEqual(resolved, { tier: "production", downgraded: false });
  assert.deepEqual(logs, []);
});

test("downgrades production when the host is staging, preview, or otherwise not allowlisted", () => {
  for (const hostname of [
    "staging.simpleonlinepharmacy.co.uk",
    "staging.weight.simpleonlinepharmacy.co.uk",
    "acquire-git-preview.vercel.app",
    "localhost",
  ]) {
    const logs: string[] = [];
    const resolved = resolveExperimentTierForHost({
      environment: "production",
      hostname,
      logger: (message) => logs.push(message),
    });

    assert.deepEqual(resolved, { tier: "staging", downgraded: true });
    assert.deepEqual(logs, [productionDowngradeMessage(hostname)]);
  }
});

test("does not promote staging or development because the host is production", () => {
  assert.deepEqual(
    resolveExperimentTierForHost({
      environment: "staging",
      hostname: "www.simpleonlinepharmacy.co.uk",
    }),
    { tier: "staging", downgraded: false }
  );
  assert.deepEqual(
    resolveExperimentTierForHost({
      environment: "development",
      hostname: "www.simpleonlinepharmacy.co.uk",
    }),
    { tier: "development", downgraded: false }
  );
});

test("leaves production unchanged when no host is available to check", () => {
  assert.deepEqual(resolveExperimentTierForHost({ environment: "production" }), {
    tier: "production",
    downgraded: false,
  });
});

test("uses a caller-supplied production allowlist", () => {
  const resolved = resolveExperimentTierForHost({
    environment: "production",
    hostname: "members.simpleonlinepharmacy.co.uk",
    productionHosts: ["members.simpleonlinepharmacy.co.uk"],
  });

  assert.equal(resolved.tier, "production");
});
