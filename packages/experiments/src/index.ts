export { getSnowplowExperimentContext } from "./core/assignments.js";
export {
  readCookieValue,
  readOrCreateStableId,
  readSnowplowDomainUserId,
  readStableId,
  SHARED_COOKIE_DOMAIN,
  STABLE_ID_COOKIE_NAME,
} from "./cookies/cookies.js";
export { DATADOG_FEATURE_FLAG_EVENTS, withDatadogFeatureFlagEvents } from "./datadog/context.js";
export { createStatsigFeatureFlagClient } from "./core/deprecated.js";
export {
  DEFAULT_PRODUCTION_HOSTS,
  normalizeExperimentTier,
  resolveExperimentTierForHost,
} from "./core/environment.js";
export { restrictedExperimentImports } from "./core/eslint.js";
export {
  configureExperiments,
  getVariant,
  initializeExperiments,
  registerDatadog,
  updateExperimentUser,
  type ConfigureExperimentsOptions,
} from "./core/evaluate.js";
export { EXPERIMENTS_STORAGE_KEY } from "./core/session.js";
export { createStatsigExperimentClient } from "./statsig/client.js";
export {
  createSnowplowExperimentsContext,
  initSnowplowTracker,
  SNOWPLOW_COOKIE_OPTIONS,
  withSnowplowCookieOptions,
} from "./snowplow/tracker.js";
export type {
  CookieStore,
  DatadogAdapters,
  ExperimentApp,
  ExperimentAssignment,
  ExperimentClient,
  ExperimentEnvironment,
  ExperimentEvaluation,
  ExperimentTier,
  ExperimentUser,
  KeyValueStore,
} from "./core/types.js";
export { buildExperimentIdentity, type ExperimentIdentity } from "./core/user.js";
