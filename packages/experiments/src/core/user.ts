import { resolveExperimentTierForHost } from "./environment.js";
import type {
  ErrorLogger,
  ExperimentApp,
  ExperimentEnvironment,
  ExperimentUser,
} from "./types.js";

type ExperimentCustomIds = {
  stableID?: string;
  snowplowDomainUserId?: string;
};

export type ExperimentIdentity = {
  user: ExperimentUser;
  environment: ExperimentEnvironment;
  downgraded: boolean;
};

export function buildExperimentIdentity(input: {
  environment: string | null | undefined;
  hostname?: string;
  productionHosts?: readonly string[];
  logger?: ErrorLogger;
  app: ExperimentApp;
  appVersion: string;
  userID?: string;
  brand?: string;
  market?: string;
  stableID?: string | null;
  snowplowDomainUserId?: string;
}): ExperimentIdentity {
  const resolved = resolveExperimentTierForHost({
    environment: input.environment,
    hostname: input.hostname,
    productionHosts: input.productionHosts,
    logger: input.logger,
  });

  const customIDs: ExperimentCustomIds = {};
  if (input.stableID) customIDs.stableID = input.stableID;
  if (input.snowplowDomainUserId) customIDs.snowplowDomainUserId = input.snowplowDomainUserId;

  const user: ExperimentUser = {
    appVersion: input.appVersion,
    custom: {
      app: input.app,
      brand: input.brand?.trim() || "sop",
      market: input.market?.trim() || "uk",
    },
  };

  const userID = input.userID?.trim();
  if (userID) user.userID = userID;
  if (customIDs.stableID || customIDs.snowplowDomainUserId) user.customIDs = customIDs;

  return {
    user,
    environment: { tier: resolved.tier },
    downgraded: resolved.downgraded,
  };
}
