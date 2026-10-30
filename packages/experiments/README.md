# @simple-online-healthcare/experiments

Framework-neutral Statsig experiment infrastructure for Kin, Members, and Acquire. It has no React dependency, so the same package runs in Next.js client code, Next.js server code, and Astro.

This package owns types, evaluation, stable IDs, exposure tracking, and the Datadog and Snowplow adapters. Kin, Members, and Acquire own the client keys, rollout decisions, and what each variant renders. Reusable experiment UI, if it is needed later, belongs in soh-ui.

```
packages/experiments/src/
├── core/        types, tier checks, evaluation, session replay
├── statsig/     Statsig client adapter
├── datadog/     RUM and logs arm tagging
├── snowplow/    shared cookie settings and experiments context
├── cookies/     statsiguuid and Snowplow domain user id
└── index.ts
```

App code calls `getVariant(experiment, surface)` when the affected UI renders. The package builds the Statsig user, tags the arm in Datadog, restores that arm after a full page reload, and keeps a Snowplow experiments context for later events. Do not import `@statsig/js-client` or `@snowplow/browser-tracker` from application code.

`createStatsigFeatureFlagClient` from `@simple-online-healthcare/hooks` is deprecated. It is React-only, client-only, and it treats `NODE_ENV` as the Statsig tier. Use this package instead.

## Environment

Pass an explicit tier: `production`, `staging`, or `development`. The package does not read `NODE_ENV` or Astro `MODE`. Any other value becomes `development`.

If the tier is `production` and the hostname is not on the production allowlist, the package logs an error and sends `staging`. The default allowlist is `simpleonlinepharmacy.co.uk` and `www.simpleonlinepharmacy.co.uk`. Pass `productionHosts` for any other production hostname. On the server, pass the request hostname as well. Without a hostname the package cannot see that a staging URL was mislabelled production.

## Statsig user

The user sent to Statsig contains only:

| Field | Source |
| --- | --- |
| `environment.tier` | Explicit tier, after the host check |
| `customIDs.stableID` | `statsiguuid` cookie. Created on `.simpleonlinepharmacy.co.uk` when missing in the browser |
| `customIDs.snowplowDomainUserId` | First segment of the `_sp_id` cookie, read synchronously. Omitted when the cookie is not there yet |
| `userID` | Member id, when the app has one |
| `appVersion` | Git SHA of the build |
| `custom.app` | `kin`, `members`, or `acquire` |
| `custom.brand` | `sop` unless the app passes another brand |
| `custom.market` | `uk` unless the app passes another market |

IP address and user agent are not sent. The Statsig SDK's own localStorage stable id is disabled.

## Next.js client

Configure once when the browser app starts. Call `getVariant` only in the component that renders the experiment, after `initializeExperiments` resolves.

```tsx
"use client";

import { useEffect, useState } from "react";
import { datadogLogs } from "@datadog/browser-logs";
import { datadogRum } from "@datadog/browser-rum";
import {
  configureExperiments,
  getVariant,
  initializeExperiments,
  initSnowplowTracker,
  withDatadogFeatureFlagEvents,
} from "@simple-online-healthcare/experiments";

export function startExperiments(userID?: string) {
  datadogRum.init(
    withDatadogFeatureFlagEvents({
      applicationId: process.env.NEXT_PUBLIC_DATADOG_APPLICATION_ID ?? "",
      clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN ?? "",
      site: "datadoghq.eu",
      service: "kin",
    })
  );
  datadogLogs.init({
    clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN ?? "",
    site: "datadoghq.eu",
    service: "kin",
  });
  initSnowplowTracker("sp", process.env.NEXT_PUBLIC_SNOWPLOW_COLLECTOR_URL ?? "", {
    appId: "kin",
  });
  configureExperiments({
    clientKey: process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY ?? "",
    environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT ?? "development",
    app: "kin",
    appVersion: process.env.NEXT_PUBLIC_APP_GIT_SHA ?? "development",
    userID,
    productionHosts: ["www.simpleonlinepharmacy.co.uk", "simpleonlinepharmacy.co.uk"],
    datadog: { rum: datadogRum, logs: datadogLogs },
  });
  return initializeExperiments();
}

export function GpDetailsSection() {
  const [variant, setVariant] = useState("");

  useEffect(() => {
    let active = true;
    void initializeExperiments().then(() => {
      if (!active) return;
      setVariant(getVariant("cro-032-gp-details", "gp-details-section"));
    });
    return () => {
      active = false;
    };
  }, []);

  return variant === "variant-b" ? <NewGpDetails /> : <OldGpDetails />;
}
```

`NEXT_PUBLIC_APP_ENVIRONMENT` and `NEXT_PUBLIC_APP_GIT_SHA` are public build-time variables the app owns. Next.js only inlines `NEXT_PUBLIC_` values into a client bundle, so a server-only name would be missing in the browser and the tier would fall back to `development`. Set them from the real deploy tier and the build SHA. Do not substitute `NODE_ENV`. The server example below can read `APP_ENVIRONMENT` and `APP_GIT_SHA` directly.

## Next.js server

`configureExperiments` and `getVariant` keep one client for the whole process. Do not call them for each server request. Build the identity and a client inside the server component that renders the surface, so concurrent requests cannot read another user's assignment. Do not evaluate the experiment from the root layout.

```tsx
import { cookies, headers } from "next/headers";
import {
  buildExperimentIdentity,
  createStatsigExperimentClient,
  readSnowplowDomainUserId,
  readStableId,
} from "@simple-online-healthcare/experiments";

export async function GpDetailsSection({ userID }: { userID?: string }) {
  const clientKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY ?? "";
  if (!clientKey) return <OldGpDetails />;

  const headerStore = await headers();
  const cookieHeader = (await cookies()).toString();
  const identity = buildExperimentIdentity({
    environment: process.env.APP_ENVIRONMENT ?? "development",
    hostname: headerStore.get("host") ?? "",
    app: "kin",
    appVersion: process.env.APP_GIT_SHA ?? "development",
    userID,
    stableID: readStableId(cookieHeader),
    snowplowDomainUserId: readSnowplowDomainUserId(cookieHeader),
    productionHosts: ["www.simpleonlinepharmacy.co.uk", "simpleonlinepharmacy.co.uk"],
  });
  const client = createStatsigExperimentClient(clientKey, identity);
  await client.initializeAsync?.();

  const variant = client.getExperiment("cro-032-gp-details").groupName ?? "";
  return variant === "variant-b" ? <NewGpDetails /> : <OldGpDetails />;
}
```

The browser creates `statsiguuid` when it is missing. A server render with no cookie omits `stableID` rather than inventing a second id.

## Astro

Acquire can use the same core. Evaluate the experiment in the script that belongs to the surface, not in a site-wide bootstrap that evaluates every experiment.

```astro
<section data-surface="gp-details-section"></section>

<script>
  import {
    configureExperiments,
    getVariant,
    initializeExperiments,
    initSnowplowTracker,
  } from "@simple-online-healthcare/experiments";

  const surface = document.querySelector("[data-surface='gp-details-section']");
  if (surface) {
    initSnowplowTracker("sp", import.meta.env.PUBLIC_SNOWPLOW_COLLECTOR_URL, {
      appId: "acquire",
    });
    configureExperiments({
      clientKey: import.meta.env.PUBLIC_STATSIG_CLIENT_KEY ?? "",
      environment: import.meta.env.PUBLIC_APP_ENVIRONMENT ?? "development",
      app: "acquire",
      appVersion: import.meta.env.PUBLIC_APP_GIT_SHA ?? "development",
      hostname: window.location.hostname,
    });
    void initializeExperiments().then(() => {
      surface.dataset.variant = getVariant("cro-032-gp-details", "gp-details-section");
    });
  }
</script>
```

Use `PUBLIC_APP_ENVIRONMENT` for the tier. Astro only exposes `PUBLIC_` values to a client script, so an unprefixed name is missing in the browser and the tier falls back to `development`. Do not use Astro `MODE`.

## Datadog

`withDatadogFeatureFlagEvents` sets `trackFeatureFlagsForEvents` to `action`, `resource`, `long_task`, and `vital`.

`getVariant` calls `addFeatureFlagEvaluation` and sets one global context property, `experiments`, on RUM and logs:

```json
{ "cro-032-gp-details": "variant-b", "exp-039-login": "control" }
```

When the Statsig evaluation reason is not `Network` or `Network:Recognized`, the same property `experiment_eval_reason` records the reason. `Network:Unrecognized`, `Uninitialized`, and `NoValues` stay visible.

Datadog keeps flags in page memory. Each accepted evaluation is also stored at `sessionStorage["experiments"]`. The next page load applies those flags again before the surface renders, including the return from Stripe checkout.

## Snowplow

`initSnowplowTracker` sets these when the page host is `simpleonlinepharmacy.co.uk`. On any other host, including localhost, the caller's cookie options stay unchanged:

- `cookieDomain: ".simpleonlinepharmacy.co.uk"`
- `cookieName: "_sp_"`
- `discoverRootDomain: true`
- `cookieSameSite: "Lax"`
- `cookieSecure: true`

Pass the Data Platform Iglu schema as the fourth argument to attach subsequent events' experiments context. The context data is `{ experiments: [{ key, group }] }`. This package does not invent a schema URI. Until that schema exists, read `getSnowplowExperimentContext()` and add those pairs to the event context the app already sends.

```ts
import {
  getSnowplowExperimentContext,
  initSnowplowTracker,
} from "@simple-online-healthcare/experiments";

initSnowplowTracker(
  "sp",
  collectorUrl,
  { appId: "kin" },
  "iglu:com.example/experiments/jsonschema/1-0-0"
);

const experiments = getSnowplowExperimentContext();
```

## ESLint

```js
import { restrictedExperimentImports } from "@simple-online-healthcare/experiments/eslint";

export default [
  {
    files: ["**/*.{js,ts,tsx}"],
    ignores: ["**/node_modules/**"],
    rules: restrictedExperimentImports.rules,
  },
];
```

The rule blocks `@statsig/js-client` and `@snowplow/browser-tracker`, including subpath imports. Datadog imports stay in the app.
