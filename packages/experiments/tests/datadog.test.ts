import assert from "node:assert/strict";
import test from "node:test";

import { DATADOG_FEATURE_FLAG_EVENTS, withDatadogFeatureFlagEvents } from "../src/datadog/context.js";

test("pins feature-flag tracking to action, resource, long task, and vital events", () => {
  const config = withDatadogFeatureFlagEvents({
    applicationId: "app",
    clientToken: "token",
    site: "datadoghq.eu",
  });

  assert.deepEqual(config.trackFeatureFlagsForEvents, [
    "action",
    "resource",
    "long_task",
    "vital",
  ]);
  assert.deepEqual(DATADOG_FEATURE_FLAG_EVENTS, ["action", "resource", "long_task", "vital"]);
  assert.equal(config.applicationId, "app");
});
