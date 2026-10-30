import { StatsigClient } from "@statsig/js-client";

import type { ExperimentClient } from "../core/types.js";
import type { ExperimentIdentity } from "../core/user.js";

export function createStatsigExperimentClient(
  clientKey: string,
  identity: ExperimentIdentity
): ExperimentClient {
  return new StatsigClient(clientKey, identity.user, {
    disableStableID: true,
    environment: { tier: identity.environment.tier },
  });
}
