import { addGlobalContexts, newTracker, type TrackerConfiguration } from "@snowplow/browser-tracker";

import { getSnowplowExperimentContext } from "../core/assignments.js";
import type { ExperimentAssignment } from "../core/types.js";

export const SNOWPLOW_COOKIE_OPTIONS = {
  cookieDomain: ".simpleonlinepharmacy.co.uk",
  cookieName: "_sp_",
  discoverRootDomain: true,
  cookieSameSite: "Lax",
  cookieSecure: true,
} as const;

export function withSnowplowCookieOptions(options: TrackerConfiguration = {}): TrackerConfiguration {
  return {
    ...options,
    cookieDomain: SNOWPLOW_COOKIE_OPTIONS.cookieDomain,
    cookieName: SNOWPLOW_COOKIE_OPTIONS.cookieName,
    discoverRootDomain: SNOWPLOW_COOKIE_OPTIONS.discoverRootDomain,
    cookieSameSite: SNOWPLOW_COOKIE_OPTIONS.cookieSameSite,
    cookieSecure: SNOWPLOW_COOKIE_OPTIONS.cookieSecure,
  };
}

export function createSnowplowExperimentsContext(schema: string): () => {
  schema: string;
  data: { experiments: ExperimentAssignment[] };
} {
  return () => ({
    schema,
    data: {
      experiments: getSnowplowExperimentContext(),
    },
  });
}

export function initSnowplowTracker(
  namespace: string,
  collectorUrl: string,
  options: TrackerConfiguration = {},
  experimentsContextSchema?: string
) {
  const tracker = newTracker(namespace, collectorUrl, withSnowplowCookieOptions(options));
  const schema = experimentsContextSchema?.trim();
  if (schema) {
    addGlobalContexts([createSnowplowExperimentsContext(schema)]);
  }
  return tracker;
}
