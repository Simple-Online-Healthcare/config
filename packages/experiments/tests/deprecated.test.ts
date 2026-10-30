import assert from "node:assert/strict";
import test from "node:test";

import { createStatsigFeatureFlagClient } from "../src/core/deprecated.js";

test("createStatsigFeatureFlagClient is deprecated", () => {
  assert.throws(
    () => createStatsigFeatureFlagClient(),
    /deprecated/
  );
});
