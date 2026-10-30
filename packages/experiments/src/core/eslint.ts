const restrictedMessage =
  "Import Statsig and Snowplow through @simple-online-healthcare/experiments.";

export const restrictedExperimentImports = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "@statsig/js-client", message: restrictedMessage },
          { name: "@snowplow/browser-tracker", message: restrictedMessage },
        ],
        patterns: [
          {
            group: ["@statsig/js-client/*", "@snowplow/browser-tracker/*"],
            message: restrictedMessage,
          },
        ],
      },
    ],
  },
};
