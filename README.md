# Shared Config Monorepo

This repository is scaffolded as a Lerna + Yarn workspaces monorepo for reusable configuration packages.

## Packages

- `@soh-utils/tsconfig`
- `@soh-utils/prettier-config`
- `@soh-utils/eslint-config`

## Getting started

```bash
yarn install
yarn packages:list
```

## Usage

### TypeScript

```json
{
  "extends": "@soh-utils/tsconfig/base"
}
```

Other available presets:

- `@soh-utils/tsconfig/node`
- `@soh-utils/tsconfig/react-library`

### Prettier

In `package.json`:

```json
{
  "prettier": "@soh-utils/prettier-config"
}
```

### ESLint

In `eslint.config.js`:

```js
import { defineConfig } from "eslint/config";
import defaultSharedConfig from "@soh-utils/eslint-config";

export default defineConfig(defaultSharedConfig);
```

`@soh-utils/eslint-config` is the default shared baseline for JavaScript and TypeScript projects.

For a Next.js app stack, use the shared app preset:

```js
import { defineConfig } from "eslint/config";
import nextAppPreset from "@soh-utils/eslint-config/next-app";

export default defineConfig(nextAppPreset);
```

`@soh-utils/eslint-config/next-app` is the more opinionated preset for app repos that need Next.js, test, and e2e coverage out of the box.

If a repo needs a tiny amount of local behavior on top, use the preset factory:

```js
import { defineConfig } from "eslint/config";
import { createNextAppConfig } from "@soh-utils/eslint-config/next-app";

export default defineConfig([
  ...createNextAppConfig({
    assertFunctionNames: ["expect", "isRequired"],
    extraIgnores: ["public/mockServiceWorker.js", "environment.d.ts"],
  }),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
    },
  },
]);
```
