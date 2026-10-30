export type ExperimentTier = "production" | "staging" | "development";

export type ExperimentApp = "kin" | "members" | "acquire";

export type ExperimentUser = {
  userID?: string;
  customIDs?: {
    stableID?: string;
    snowplowDomainUserId?: string;
  };
  appVersion: string;
  custom: {
    app: ExperimentApp;
    brand: string;
    market: string;
  };
};

export type ExperimentEnvironment = {
  tier: ExperimentTier;
};

export type ExperimentEvaluation = {
  groupName: string | null;
  details: {
    reason: string;
  };
};

export type ExperimentClient = {
  getExperiment: (name: string) => ExperimentEvaluation;
  initializeAsync?: () => Promise<unknown>;
  updateUserAsync?: (user: ExperimentUser) => Promise<unknown>;
};

export type CookieStore = {
  read: () => string;
  write: (cookie: string) => void;
};

export type KeyValueStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type ErrorLogger = (message: string) => void;

export type DatadogRum = {
  addFeatureFlagEvaluation: (key: string, value: string) => void;
  setGlobalContextProperty: (key: string, value: unknown) => void;
};

export type DatadogLogs = {
  setGlobalContextProperty: (key: string, value: unknown) => void;
};

export type DatadogAdapters = {
  rum?: DatadogRum;
  logs?: DatadogLogs;
};

export type ExperimentAssignment = {
  key: string;
  group: string;
};
