import type { ErrorLogger, ExperimentTier } from "./types.js";

export const DEFAULT_PRODUCTION_HOSTS = [
  "simpleonlinepharmacy.co.uk",
  "www.simpleonlinepharmacy.co.uk",
];

const HOST_DOWNGRADE_MESSAGE = (hostname: string) =>
  `Statsig environment "production" does not match host "${hostname}". Using staging.`;

export function normalizeHostname(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase().replace(/\.$/, "");
  const colon = trimmed.indexOf(":");
  if (colon === -1) return trimmed;
  return trimmed.slice(0, colon);
}

export function normalizeExperimentTier(value: string | null | undefined): ExperimentTier {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "production" || normalized === "staging" || normalized === "development") {
    return normalized;
  }
  return "development";
}

export function isHealthyNetworkReason(reason: string): boolean {
  return reason === "Network" || reason === "Network:Recognized";
}

export function resolveExperimentTierForHost(input: {
  environment: string | null | undefined;
  hostname?: string;
  productionHosts?: readonly string[];
  logger?: ErrorLogger;
}): { tier: ExperimentTier; downgraded: boolean } {
  const tier = normalizeExperimentTier(input.environment);
  const hostname = normalizeHostname(input.hostname ?? "");
  if (tier !== "production" || !hostname) {
    return { tier, downgraded: false };
  }

  const allowlist = (input.productionHosts ?? DEFAULT_PRODUCTION_HOSTS).map((host) =>
    normalizeHostname(host)
  );
  if (allowlist.includes(hostname)) {
    return { tier: "production", downgraded: false };
  }

  input.logger?.(HOST_DOWNGRADE_MESSAGE(hostname));
  return { tier: "staging", downgraded: true };
}

export function productionDowngradeMessage(hostname: string): string {
  return HOST_DOWNGRADE_MESSAGE(normalizeHostname(hostname));
}
