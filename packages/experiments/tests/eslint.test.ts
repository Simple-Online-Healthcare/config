import assert from "node:assert/strict";
import test from "node:test";

import { ESLint } from "eslint";

import { restrictedExperimentImports } from "../src/core/eslint.js";

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.{js,ts,tsx}"],
      rules: restrictedExperimentImports.rules,
    },
  ],
});

async function lint(code: string) {
  const [result] = await eslint.lintText(code, { filePath: "app.ts" });
  return result?.messages.filter((message) => message.ruleId === "no-restricted-imports") ?? [];
}

test("blocks direct Statsig and Snowplow imports", async () => {
  const messages = await lint(
    [
      'import { StatsigClient } from "@statsig/js-client";',
      'import { newTracker } from "@snowplow/browser-tracker";',
      'import extra from "@statsig/js-client/internal";',
    ].join("\n")
  );

  assert.equal(messages.length, 3);
});

test("allows the shared experiments package", async () => {
  const messages = await lint(
    'import { getVariant } from "@simple-online-healthcare/experiments";\nvoid getVariant;\n'
  );

  assert.deepEqual(messages, []);
});
