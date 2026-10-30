import {
  getSnowplowExperimentContext,
  replaceExperimentAssignments,
  setExperimentAssignment,
  storedGroup,
} from "./assignments.js";
import { readOrCreateStableId, readSnowplowDomainUserId } from "../cookies/cookies.js";
import { publishExperimentContext, replayExperimentContext } from "../datadog/context.js";
import { isHealthyNetworkReason } from "./environment.js";
import { assignmentsFromRecord, readStoredExperiments, recordFromAssignments, writeStoredExperiments } from "./session.js";
import type {
  CookieStore,
  DatadogAdapters,
  ErrorLogger,
  ExperimentApp,
  ExperimentClient,
  KeyValueStore,
} from "./types.js";
import { createStatsigExperimentClient } from "../statsig/client.js";
import { buildExperimentIdentity, type ExperimentIdentity } from "./user.js";

export type ConfigureExperimentsOptions = {
  clientKey?: string;
  environment: string;
  app: ExperimentApp;
  appVersion: string;
  userID?: string;
  brand?: string;
  market?: string;
  hostname?: string;
  productionHosts?: readonly string[];
  secure?: boolean;
  cookieHeader?: string;
  cookieStore?: CookieStore;
  sessionStore?: KeyValueStore;
  logger?: ErrorLogger;
  datadog?: DatadogAdapters;
  client?: ExperimentClient;
  createClient?: (identity: ExperimentIdentity) => ExperimentClient;
};

type RuntimeState = {
  options: ConfigureExperimentsOptions | null;
  client: ExperimentClient | null;
  datadog: DatadogAdapters;
  sessionStore: KeyValueStore;
  cookieStore: CookieStore;
  hostname: string;
  secure: boolean;
  reasons: Record<string, string>;
};

const emptyStore: KeyValueStore = {
  getItem: () => null,
  setItem: () => undefined,
};

let initializing: Promise<void> | null = null;

const state: RuntimeState = {
  options: null,
  client: null,
  datadog: {},
  sessionStore: emptyStore,
  cookieStore: { read: () => "", write: () => undefined },
  hostname: "",
  secure: false,
  reasons: {},
};

function browserCookieStore(): CookieStore {
  return {
    read: () => document.cookie,
    write: (cookie: string) => {
      document.cookie = cookie;
    },
  };
}

function browserSessionStore(): KeyValueStore {
  return {
    getItem: (key) => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // Privacy mode and quota failures should not break the page.
      }
    },
  };
}

function currentHostname(override?: string): string {
  if (override) return override;
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

function currentSecure(override: boolean | undefined): boolean {
  if (override !== undefined) return override;
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

function resolveCookieStore(options: ConfigureExperimentsOptions): CookieStore {
  if (options.cookieStore) return options.cookieStore;
  if (typeof document !== "undefined") return browserCookieStore();
  const header = options.cookieHeader ?? "";
  return { read: () => header, write: () => undefined };
}

function resolveSessionStore(store: KeyValueStore | undefined): KeyValueStore {
  if (store) return store;
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    return browserSessionStore();
  }
  return emptyStore;
}

function currentIdentity(userID: string | undefined): ExperimentIdentity | null {
  const options = state.options;
  if (!options) return null;

  return buildExperimentIdentity({
    environment: options.environment,
    hostname: state.hostname,
    productionHosts: options.productionHosts,
    logger: options.logger ?? console.error,
    app: options.app,
    appVersion: options.appVersion,
    userID,
    brand: options.brand,
    market: options.market,
    stableID: readOrCreateStableId(state.cookieStore, state.hostname, state.secure),
    snowplowDomainUserId: readSnowplowDomainUserId(state.cookieStore.read()),
  });
}

function persistAssignments(): void {
  writeStoredExperiments(state.sessionStore, recordFromAssignments(getSnowplowExperimentContext()));
}

function restoreStoredAssignments(): void {
  replaceExperimentAssignments(assignmentsFromRecord(readStoredExperiments(state.sessionStore)));
}

export function registerDatadog(adapters: DatadogAdapters): void {
  state.datadog = adapters;
  replayExperimentContext(
    state.datadog,
    recordFromAssignments(getSnowplowExperimentContext())
  );
}

export function configureExperiments(options: ConfigureExperimentsOptions): ExperimentIdentity {
  state.options = options;
  state.datadog = options.datadog ?? {};
  state.sessionStore = resolveSessionStore(options.sessionStore);
  state.cookieStore = resolveCookieStore(options);
  state.hostname = currentHostname(options.hostname);
  state.secure = currentSecure(options.secure);
  state.reasons = {};
  initializing = null;
  restoreStoredAssignments();

  const identity = currentIdentity(options.userID);
  if (!identity) {
    throw new Error("configureExperiments requires an environment and app.");
  }

  if (options.createClient) {
    state.client = options.createClient(identity);
  } else if (options.client) {
    state.client = options.client;
  } else if (options.clientKey) {
    state.client = createStatsigExperimentClient(options.clientKey, identity);
  } else {
    state.client = null;
  }

  replayExperimentContext(
    state.datadog,
    recordFromAssignments(getSnowplowExperimentContext())
  );
  return identity;
}

export function initializeExperiments(): Promise<void> {
  const client = state.client;
  if (!client?.initializeAsync) return Promise.resolve();
  initializing ??= client.initializeAsync().then(
    () => undefined,
    () => undefined
  );
  return initializing;
}

export async function updateExperimentUser(input: { userID?: string }): Promise<void> {
  const options = state.options;
  if (!options) return;
  state.options = { ...options, userID: input.userID };
  const identity = currentIdentity(input.userID);
  if (!identity) return;
  await state.client?.updateUserAsync?.(identity.user);
}

export function getVariant(experiment: string, surface: string): string {
  const experimentName = experiment.trim();
  const surfaceName = surface.trim();
  if (!experimentName || !surfaceName) {
    throw new Error(
      "getVariant requires an experiment name and the UI surface that is rendering it."
    );
  }

  const client = state.client;
  if (!client) return storedGroup(experimentName);

  let groupName = "";
  let reason = "NoValues";
  try {
    const evaluation = client.getExperiment(experimentName);
    reason = evaluation.details.reason;
    if (evaluation.groupName) groupName = evaluation.groupName;
  } catch (error) {
    reason = "Error";
    const message = error instanceof Error ? error.message : "Experiment evaluation failed.";
    state.options?.logger?.(message);
  }

  if (isHealthyNetworkReason(reason)) {
    delete state.reasons[experimentName];
  } else {
    state.reasons[experimentName] = reason;
  }

  if (groupName) {
    setExperimentAssignment(experimentName, groupName);
    persistAssignments();
  }

  publishExperimentContext(
    state.datadog,
    recordFromAssignments(getSnowplowExperimentContext()),
    { ...state.reasons },
    groupName ? { key: experimentName, group: groupName } : undefined
  );

  return groupName || storedGroup(experimentName);
}
