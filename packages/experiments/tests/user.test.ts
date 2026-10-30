import assert from "node:assert/strict";
import test from "node:test";

import { readSnowplowDomainUserId, readStableId } from "../src/cookies/cookies.js";
import { buildExperimentIdentity } from "../src/core/user.js";

const allowedUserKeys = ["appVersion", "custom", "customIDs", "userID"];

function collectKeys(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
}

test("builds the Statsig user from cookies and the explicit field allowlist", () => {
  const cookie = "statsiguuid=0123456789abcdef; _sp_id.13f2=domain-user.169.1";
  const identity = buildExperimentIdentity({
    environment: "production",
    hostname: "www.simpleonlinepharmacy.co.uk",
    app: "kin",
    appVersion: "a1b2c3d",
    userID: "member-42",
    stableID: readStableId(cookie),
    snowplowDomainUserId: readSnowplowDomainUserId(cookie),
  });

  assert.deepEqual(Object.keys(identity.user).sort(), allowedUserKeys);
  assert.deepEqual(Object.keys(identity.user.customIDs ?? {}).sort(), [
    "snowplowDomainUserId",
    "stableID",
  ]);
  assert.deepEqual(identity.user.custom, { app: "kin", brand: "sop", market: "uk" });
  assert.equal(identity.user.userID, "member-42");
  assert.equal(identity.user.customIDs?.stableID, "0123456789abcdef");
  assert.equal(identity.user.customIDs?.snowplowDomainUserId, "domain-user");
  assert.deepEqual(identity.environment, { tier: "production" });

  const keys = new Set(collectKeys({ user: identity.user, environment: identity.environment }));
  for (const forbidden of ["ip", "userAgent", "email", "country", "privateAttributes"]) {
    assert.equal(keys.has(forbidden), false);
  }
});

test("omits the Snowplow id and user id when they are absent", () => {
  const identity = buildExperimentIdentity({
    environment: "staging",
    app: "members",
    appVersion: "sha",
    stableID: "0123456789abcdef",
  });

  assert.deepEqual(identity.user.customIDs, { stableID: "0123456789abcdef" });
  assert.equal(Object.hasOwn(identity.user, "userID"), false);
  assert.equal(identity.environment.tier, "staging");
});

test("omits custom ids when neither cookie is present", () => {
  const identity = buildExperimentIdentity({
    environment: "not-a-tier",
    hostname: "staging.simpleonlinepharmacy.co.uk",
    app: "acquire",
    appVersion: "sha",
    brand: "sop",
    market: "uk",
  });

  assert.equal(identity.environment.tier, "development");
  assert.equal(Object.hasOwn(identity.user, "customIDs"), false);
  assert.equal(identity.downgraded, false);
});

test("downgrades a production tier on a non-production host before the user is sent", () => {
  const logs: string[] = [];
  const identity = buildExperimentIdentity({
    environment: "production",
    hostname: "acquire-preview.vercel.app",
    app: "acquire",
    appVersion: "sha",
    logger: (message) => logs.push(message),
  });

  assert.equal(identity.environment.tier, "staging");
  assert.equal(identity.downgraded, true);
  assert.equal(logs.length, 1);
});
