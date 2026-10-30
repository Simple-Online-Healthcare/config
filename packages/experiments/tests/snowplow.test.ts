import assert from "node:assert/strict";
import test from "node:test";

import { setExperimentAssignment } from "../src/core/assignments.js";
import { createSnowplowExperimentsContext, withSnowplowCookieOptions } from "../src/snowplow/tracker.js";

test("pins the shared Snowplow cookie settings", () => {
  const options = withSnowplowCookieOptions(
    {
      appId: "kin",
      cookieDomain: "localhost",
      cookieName: "custom",
      cookieSecure: false,
      discoverRootDomain: false,
    },
    "www.simpleonlinepharmacy.co.uk"
  );

  assert.equal(options.appId, "kin");
  assert.equal(options.cookieDomain, ".simpleonlinepharmacy.co.uk");
  assert.equal(options.cookieName, "_sp_");
  assert.equal(options.discoverRootDomain, true);
  assert.equal(options.cookieSameSite, "Lax");
  assert.equal(options.cookieSecure, true);
});

test("leaves Snowplow cookie options unchanged off the shared host", () => {
  const input = {
    appId: "kin",
    cookieDomain: "localhost",
    cookieName: "custom",
    cookieSecure: false,
    discoverRootDomain: false,
  };

  assert.equal(withSnowplowCookieOptions(input, "localhost"), input);
});

test("builds an experiments context from evaluations made so far", () => {
  setExperimentAssignment("cro-032-gp-details", "variant-b");
  const context = createSnowplowExperimentsContext(
    "iglu:com.example/experiments/jsonschema/1-0-0"
  )();

  assert.equal(context.schema, "iglu:com.example/experiments/jsonschema/1-0-0");
  assert.deepEqual(context.data.experiments, [{ key: "cro-032-gp-details", group: "variant-b" }]);
});
