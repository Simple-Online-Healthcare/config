import assert from "node:assert/strict";
import test from "node:test";

import { getSnowplowExperimentContext } from "../src/core/assignments.js";
import { configureExperiments, getVariant, initializeExperiments, updateExperimentUser } from "../src/core/evaluate.js";
import type { DatadogAdapters, ExperimentClient, ExperimentEvaluation, KeyValueStore } from "../src/core/types.js";

function memoryStore(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function createDatadog() {
  const flags: string[] = [];
  const context: Record<string, unknown> = {};
  const logsContext: Record<string, unknown> = {};
  const adapters: DatadogAdapters = {
    rum: {
      addFeatureFlagEvaluation(key, value) {
        flags.push(`${key}=${value}`);
      },
      setGlobalContextProperty(key, value) {
        context[key] = value;
      },
    },
    logs: {
      setGlobalContextProperty(key, value) {
        logsContext[key] = value;
      },
    },
  };
  return { adapters, flags, context, logsContext };
}

function evaluation(groupName: string | null, reason: string): ExperimentEvaluation {
  return { groupName, details: { reason } };
}

test("does not evaluate an experiment until getVariant is called for its surface", async () => {
  let evaluations = 0;
  const client: ExperimentClient = {
    initializeAsync() {
      return Promise.resolve();
    },
    getExperiment(name) {
      evaluations += 1;
      assert.equal(name, "cro-032-gp-details");
      return evaluation("variant-b", "Network:Recognized");
    },
  };

  configureExperiments({
    environment: "development",
    app: "kin",
    appVersion: "sha",
    sessionStore: memoryStore(),
    client,
  });
  assert.equal(evaluations, 0);

  await initializeExperiments();
  assert.equal(evaluations, 0);
  assert.equal(getVariant("cro-032-gp-details", "gp-details-section"), "variant-b");
  assert.equal(evaluations, 1);
});

test("requires the rendered surface and does not evaluate a second experiment", () => {
  const seen: string[] = [];
  configureExperiments({
    environment: "development",
    app: "members",
    appVersion: "sha",
    sessionStore: memoryStore(),
    client: {
      getExperiment(name) {
        seen.push(name);
        return evaluation("control", "Network:Recognized");
      },
    },
  });

  assert.throws(
    () => getVariant("exp-039-login", " "),
    /surface/
  );
  assert.deepEqual(seen, []);
  assert.equal(getVariant("exp-039-login", "login-form"), "control");
  assert.deepEqual(seen, ["exp-039-login"]);
});

test("tags Datadog with the experiment arm and the eval reason when it is not a network result", () => {
  const datadog = createDatadog();
  const store = memoryStore();
  configureExperiments({
    environment: "staging",
    app: "kin",
    appVersion: "sha",
    sessionStore: store,
    datadog: datadog.adapters,
    client: {
      getExperiment() {
        return evaluation("variant-b", "Uninitialized");
      },
    },
  });

  assert.equal(getVariant("cro-032-gp-details", "gp-details-section"), "variant-b");
  assert.deepEqual(datadog.flags, ["cro-032-gp-details=variant-b"]);
  assert.deepEqual(datadog.context.experiments, { "cro-032-gp-details": "variant-b" });
  assert.deepEqual(datadog.logsContext.experiments, { "cro-032-gp-details": "variant-b" });
  assert.deepEqual(datadog.context.experiment_eval_reason, {
    "cro-032-gp-details": "Uninitialized",
  });
  assert.deepEqual(datadog.logsContext.experiment_eval_reason, {
    "cro-032-gp-details": "Uninitialized",
  });
  assert.equal(
    store.getItem("experiments"),
    JSON.stringify({ "cro-032-gp-details": "variant-b" })
  );
  assert.deepEqual(getSnowplowExperimentContext(), [
    { key: "cro-032-gp-details", group: "variant-b" },
  ]);
});

test("does not tag a healthy network evaluation reason", () => {
  const datadog = createDatadog();
  configureExperiments({
    environment: "development",
    app: "acquire",
    appVersion: "sha",
    sessionStore: memoryStore(),
    datadog: datadog.adapters,
    client: {
      getExperiment() {
        return evaluation("control", "Network:Recognized");
      },
    },
  });

  getVariant("exp-039-login", "login-form");
  assert.deepEqual(datadog.context.experiment_eval_reason, {});
});

test("replays stored experiments to Datadog after a reload without evaluating again", () => {
  const store = memoryStore();
  configureExperiments({
    environment: "development",
    app: "kin",
    appVersion: "sha",
    sessionStore: store,
    client: {
      getExperiment() {
        return evaluation("variant-b", "Network:Recognized");
      },
    },
  });
  getVariant("cro-032-gp-details", "gp-details-section");

  const datadog = createDatadog();
  let evaluations = 0;
  configureExperiments({
    environment: "development",
    app: "kin",
    appVersion: "sha",
    sessionStore: store,
    datadog: datadog.adapters,
    client: {
      getExperiment() {
        evaluations += 1;
        return evaluation(null, "Uninitialized");
      },
    },
  });

  assert.equal(evaluations, 0);
  assert.deepEqual(datadog.flags, ["cro-032-gp-details=variant-b"]);
  assert.deepEqual(datadog.context.experiments, { "cro-032-gp-details": "variant-b" });
  assert.deepEqual(datadog.logsContext.experiments, { "cro-032-gp-details": "variant-b" });

  assert.equal(getVariant("cro-032-gp-details", "checkout-complete"), "variant-b");
  assert.equal(evaluations, 1);
  assert.equal(store.getItem("experiments"), JSON.stringify({ "cro-032-gp-details": "variant-b" }));
  assert.deepEqual(datadog.context.experiment_eval_reason, {
    "cro-032-gp-details": "Uninitialized",
  });
});

test("tags an unrecognised network evaluation and passes only allowlisted user fields", () => {
  const logs: string[] = [];
  let tier = "";
  const client: ExperimentClient = {
    getExperiment() {
      return evaluation("control", "Network:Unrecognized");
    },
  };

  const identity = configureExperiments({
    environment: "production",
    hostname: "staging.weight.simpleonlinepharmacy.co.uk",
    app: "acquire",
    appVersion: "build-sha",
    userID: "member-7",
    cookieHeader: "statsiguuid=0123456789abcdef; _sp_id.abc=sp-domain.1",
    sessionStore: memoryStore(),
    logger: (message) => logs.push(message),
    createClient(next) {
      tier = next.environment.tier;
      assert.deepEqual(Object.keys(next.user).sort(), ["appVersion", "custom", "customIDs", "userID"]);
      assert.equal(next.user.customIDs?.snowplowDomainUserId, "sp-domain");
      assert.equal(next.user.custom.app, "acquire");
      assert.equal(Object.hasOwn(next.user, "ip"), false);
      assert.equal(Object.hasOwn(next.user, "userAgent"), false);
      return client;
    },
  });

  assert.equal(tier, "staging");
  assert.equal(identity.environment.tier, "staging");
  assert.equal(logs.length, 1);

  const datadog = createDatadog();
  configureExperiments({
    environment: "development",
    app: "acquire",
    appVersion: "build-sha",
    sessionStore: memoryStore(),
    datadog: datadog.adapters,
    client,
  });
  getVariant("exp-039-login", "login-form");
  assert.deepEqual(datadog.context.experiment_eval_reason, {
    "exp-039-login": "Network:Unrecognized",
  });
});

test("updating the signed-in user does not evaluate an experiment", async () => {
  let evaluations = 0;
  let updatedUserId = "";
  configureExperiments({
    environment: "development",
    app: "members",
    appVersion: "sha",
    sessionStore: memoryStore(),
    cookieHeader: "statsiguuid=0123456789abcdef",
    client: {
      getExperiment() {
        evaluations += 1;
        return evaluation("control", "Network");
      },
      updateUserAsync(user) {
        updatedUserId = user.userID ?? "";
        return Promise.resolve();
      },
    },
  });

  await updateExperimentUser({ userID: "member-9" });
  assert.equal(evaluations, 0);
  assert.equal(updatedUserId, "member-9");
});
