import type { ExperimentAssignment } from "./types.js";

let assignments: ExperimentAssignment[] = [];

export function replaceExperimentAssignments(next: readonly ExperimentAssignment[]): void {
  assignments = next.map((assignment) => ({ key: assignment.key, group: assignment.group }));
}

export function setExperimentAssignment(key: string, group: string): void {
  assignments = [...assignments.filter((assignment) => assignment.key !== key), { key, group }];
}

export function getSnowplowExperimentContext(): ExperimentAssignment[] {
  return assignments.map((assignment) => ({ key: assignment.key, group: assignment.group }));
}

export function storedGroup(experiment: string): string {
  return assignments.find((assignment) => assignment.key === experiment)?.group ?? "";
}
