/**
 * @deprecated Use `configureExperiments` and `getVariant` from
 * `@simple-online-healthcare/experiments`.
 * `createStatsigFeatureFlagClient` from `@simple-online-healthcare/hooks` is React-only,
 * client-only, and resolves the Statsig tier from `NODE_ENV`.
 */
export function createStatsigFeatureFlagClient(): never {
  throw new Error(
    "createStatsigFeatureFlagClient is deprecated. Use configureExperiments and getVariant from @simple-online-healthcare/experiments."
  );
}
