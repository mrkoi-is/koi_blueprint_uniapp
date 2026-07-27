export type RuntimePlatform = "h5" | "mp-weixin" | "other";
export type WeixinEnvironment = "develop" | "trial" | "release";
export type AppEnvironment = "local" | "staging" | "production";

export interface RuntimeFacts {
  readonly buildMode: "development" | "production";
  readonly platform: RuntimePlatform;
  readonly weixinEnvironment?: WeixinEnvironment;
}

export interface RuntimeConfig {
  readonly apiBaseUrl: string;
  readonly appTitle: string;
  readonly environment: AppEnvironment;
  readonly platform: RuntimePlatform;
  readonly requestTimeoutMs: number;
  readonly useLocalDemoData: boolean;
}

export interface RuntimeConfigInput {
  readonly apiBaseUrlLocal: string | undefined;
  readonly apiBaseUrlProduction: string | undefined;
  readonly apiBaseUrlStaging: string | undefined;
  readonly requestTimeoutMs: string | undefined;
}

const DEFAULT_API_BASE_URLS: Readonly<Record<AppEnvironment, string>> = {
  local: "https://dev-api.example.com",
  staging: "https://staging-api.example.com",
  production: "https://api.example.com",
};
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const EMPTY_INPUT: RuntimeConfigInput = {
  apiBaseUrlLocal: undefined,
  apiBaseUrlProduction: undefined,
  apiBaseUrlStaging: undefined,
  requestTimeoutMs: undefined,
};

function normalizeApiBaseUrl(
  environment: AppEnvironment,
  configuredValue: string | undefined,
): string {
  const value = configuredValue?.trim() || DEFAULT_API_BASE_URLS[environment];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${environment} API base URL must be an absolute URL.`);
  }
  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const localHttp =
    environment === "local" && url.protocol === "http:" && localHost;

  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(
      `${environment} API base URL must use HTTPS or local-loopback HTTP.`,
    );
  }
  if (
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      `${environment} API base URL must not contain credentials, query, or hash.`,
    );
  }

  return url.toString().replace(/\/$/u, "");
}

function parseRequestTimeout(configuredValue: string | undefined): number {
  if (configuredValue === undefined || configuredValue.trim().length === 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const timeout = Number(configuredValue);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60_000) {
    throw new Error(
      "Request timeout must be an integer from 100 through 60000.",
    );
  }
  return timeout;
}

export function resolveRuntimeConfig(
  facts: RuntimeFacts,
  input: RuntimeConfigInput = EMPTY_INPUT,
): RuntimeConfig {
  const environment =
    facts.buildMode === "development"
      ? "local"
      : facts.platform === "mp-weixin" && facts.weixinEnvironment === "trial"
        ? "staging"
        : "production";
  const configuredApiBaseUrl = {
    local: input.apiBaseUrlLocal,
    staging: input.apiBaseUrlStaging,
    production: input.apiBaseUrlProduction,
  }[environment];

  return {
    apiBaseUrl: normalizeApiBaseUrl(environment, configuredApiBaseUrl),
    appTitle: "{{PROJECT_TITLE}}",
    environment,
    platform: facts.platform,
    requestTimeoutMs: parseRequestTimeout(input.requestTimeoutMs),
    useLocalDemoData: environment === "local",
  };
}
