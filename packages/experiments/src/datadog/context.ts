import type { DatadogAdapters } from "../core/types.js";

export const DATADOG_FEATURE_FLAG_EVENTS = ["action", "resource", "long_task", "vital"] as const;

export function withDatadogFeatureFlagEvents<T extends object>(
  config: T
): T & { trackFeatureFlagsForEvents: typeof DATADOG_FEATURE_FLAG_EVENTS } {
  return {
    ...config,
    trackFeatureFlagsForEvents: DATADOG_FEATURE_FLAG_EVENTS,
  };
}

export function publishExperimentContext(
  adapters: DatadogAdapters,
  experiments: Record<string, string>,
  reasons: Record<string, string>,
  evaluatedFlag?: { key: string; group: string }
): void {
  const rum = adapters.rum;
  const logs = adapters.logs;

  if (rum && evaluatedFlag?.group) {
    rum.addFeatureFlagEvaluation(evaluatedFlag.key, evaluatedFlag.group);
  }

  if (rum) rum.setGlobalContextProperty("experiments", experiments);
  if (logs) logs.setGlobalContextProperty("experiments", experiments);

  if (rum) rum.setGlobalContextProperty("experiment_eval_reason", reasons);
  if (logs) logs.setGlobalContextProperty("experiment_eval_reason", reasons);
}

export function replayExperimentContext(
  adapters: DatadogAdapters,
  experiments: Record<string, string>
): void {
  const rum = adapters.rum;
  if (rum) {
    for (const [key, group] of Object.entries(experiments)) {
      rum.addFeatureFlagEvaluation(key, group);
    }
    rum.setGlobalContextProperty("experiments", experiments);
  }
  adapters.logs?.setGlobalContextProperty("experiments", experiments);
}
