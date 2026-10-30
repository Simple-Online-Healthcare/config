import type { ExperimentAssignment, KeyValueStore } from "./types.js";

export const EXPERIMENTS_STORAGE_KEY = "experiments";

export function readStoredExperiments(store: KeyValueStore): Record<string, string> {
  const raw = store.getItem(EXPERIMENTS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const experiments: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) experiments[key] = value;
    }
    return experiments;
  } catch {
    return {};
  }
}

export function writeStoredExperiments(
  store: KeyValueStore,
  experiments: Record<string, string>
): void {
  store.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(experiments));
}

export function assignmentsFromRecord(experiments: Record<string, string>): ExperimentAssignment[] {
  return Object.entries(experiments).map(([key, group]) => ({ key, group }));
}

export function recordFromAssignments(
  assignments: readonly ExperimentAssignment[]
): Record<string, string> {
  const experiments: Record<string, string> = {};
  for (const assignment of assignments) {
    experiments[assignment.key] = assignment.group;
  }
  return experiments;
}
