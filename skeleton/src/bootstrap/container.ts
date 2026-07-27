import { resolveRuntimeConfig } from "../core/config/runtime-config";
import type { FeedbackPort } from "../core/feedback/feedback-port";
import {
  DemoWelcomeRepository,
  LoadHome,
  RemoteWelcomeRepository,
  type WelcomeRepository,
} from "../features/home/public";
import { UniFeedbackAdapter } from "../platform/uni/feedback-adapter";
import { UniHttpClient } from "../platform/uni/uni-http-client";
import { UniRuntimeAdapter } from "../platform/uni/runtime-adapter";

interface AppServices {
  readonly feedback: FeedbackPort;
  readonly home: {
    readonly load: LoadHome;
  };
}

function createServices(): AppServices {
  const runtime = new UniRuntimeAdapter();
  const config = resolveRuntimeConfig(runtime.facts(), {
    apiBaseUrlLocal: import.meta.env.VITE_API_BASE_URL_LOCAL,
    apiBaseUrlProduction: import.meta.env.VITE_API_BASE_URL_PRODUCTION,
    apiBaseUrlStaging: import.meta.env.VITE_API_BASE_URL_STAGING,
    requestTimeoutMs: import.meta.env.VITE_REQUEST_TIMEOUT_MS,
  });
  const http = new UniHttpClient(config.apiBaseUrl, config.requestTimeoutMs);
  const welcomeRepository: WelcomeRepository = config.useLocalDemoData
    ? new DemoWelcomeRepository(config.appTitle)
    : new RemoteWelcomeRepository(http);

  return {
    feedback: new UniFeedbackAdapter(),
    home: {
      load: new LoadHome(welcomeRepository),
    },
  };
}

export const appServices = createServices();
