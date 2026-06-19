# Shared Config Monorepo

This repository is scaffolded as a Lerna + Yarn workspaces monorepo for reusable configuration packages.

## Packages

- `@simple-online-healthcare/tsconfig`
- `@simple-online-healthcare/prettier-config`
- `@simple-online-healthcare/eslint-config`

## Getting started

```bash
yarn install
yarn packages:list
```

## Usage

### TypeScript

```json
{
  "extends": "@simple-online-healthcare/tsconfig/base"
}
```

Other available presets:

- `@simple-online-healthcare/tsconfig/node`
- `@simple-online-healthcare/tsconfig/react-library`
- `@simple-online-healthcare/tsconfig/next-app`

### Prettier

In `package.json`:

```json
{
  "prettier": "@simple-online-healthcare/prettier-config"
}
```

### ESLint

In `eslint.config.js`:

```js
import { defineConfig } from "eslint/config";
import defaultSharedConfig from "@simple-online-healthcare/eslint-config";

export default defineConfig(defaultSharedConfig);
```

`@simple-online-healthcare/eslint-config` is the default shared baseline for JavaScript and TypeScript projects.

For a Next.js app stack, use the shared app preset:

```js
import { defineConfig } from "eslint/config";
import nextAppPreset from "@simple-online-healthcare/eslint-config/next-app";

export default defineConfig(nextAppPreset);
```

`@simple-online-healthcare/eslint-config/next-app` is the more opinionated preset for app repos that need Next.js, test, and e2e coverage out of the box.

If a repo needs a tiny amount of local behavior on top, use the preset factory:

```js
import { defineConfig } from "eslint/config";
import { createNextAppConfig } from "@simple-online-healthcare/eslint-config/next-app";

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

## Releasing

This repo uses Changesets to manage package versions and npm releases.

1. Create a changeset for package changes:

```bash
yarn changeset
```

2. Commit the generated file under `.changeset/`.

3. When changes land on `main`, the GitHub Actions release workflow will:
   - open or update a release PR with version bumps and generated package changelog updates
   - publish the packages to npm after that release PR is merged

The release workflow expects an `NPM_TOKEN` repository secret with permission to publish the `@simple-online-healthcare/*` packages.
