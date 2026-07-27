import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "../../src/core/config/runtime-config";

describe("resolveRuntimeConfig", () => {
  it("uses explicit local data in development builds", () => {
    expect(
      resolveRuntimeConfig({
        buildMode: "development",
        platform: "h5",
      }),
    ).toMatchObject({
      environment: "local",
      platform: "h5",
      useLocalDemoData: true,
    });
  });

  it("uses staging for a WeChat trial build", () => {
    expect(
      resolveRuntimeConfig({
        buildMode: "production",
        platform: "mp-weixin",
        weixinEnvironment: "trial",
      }),
    ).toMatchObject({
      environment: "staging",
      platform: "mp-weixin",
      useLocalDemoData: false,
    });
  });

  it("uses production for release and H5 production builds", () => {
    expect(
      resolveRuntimeConfig({
        buildMode: "production",
        platform: "mp-weixin",
        weixinEnvironment: "release",
      }).environment,
    ).toBe("production");
    expect(
      resolveRuntimeConfig({
        buildMode: "production",
        platform: "h5",
      }).environment,
    ).toBe("production");
  });

  it("returns an HTTPS API base and finite timeout", () => {
    const config = resolveRuntimeConfig({
      buildMode: "production",
      platform: "h5",
    });

    expect(config.apiBaseUrl.startsWith("https://")).toBe(true);
    expect(config.requestTimeoutMs).toBeGreaterThan(0);
  });

  it("accepts typed public environment overrides", () => {
    const config = resolveRuntimeConfig(
      {
        buildMode: "production",
        platform: "mp-weixin",
        weixinEnvironment: "trial",
      },
      {
        apiBaseUrlLocal: "http://127.0.0.1:8787/",
        apiBaseUrlProduction: "https://prod.example.test/",
        apiBaseUrlStaging: "https://trial.example.test/",
        requestTimeoutMs: "2500",
      },
    );

    expect(config).toMatchObject({
      apiBaseUrl: "https://trial.example.test",
      environment: "staging",
      requestTimeoutMs: 2500,
    });
  });

  it("allows loopback HTTP only for local development", () => {
    expect(
      resolveRuntimeConfig(
        {
          buildMode: "development",
          platform: "h5",
        },
        {
          apiBaseUrlLocal: "http://localhost:8787",
          apiBaseUrlProduction: undefined,
          apiBaseUrlStaging: undefined,
          requestTimeoutMs: undefined,
        },
      ).apiBaseUrl,
    ).toBe("http://localhost:8787");

    expect(() =>
      resolveRuntimeConfig(
        {
          buildMode: "production",
          platform: "h5",
        },
        {
          apiBaseUrlLocal: undefined,
          apiBaseUrlProduction: "http://api.example.test",
          apiBaseUrlStaging: undefined,
          requestTimeoutMs: undefined,
        },
      ),
    ).toThrow(/must use HTTPS/u);
  });

  it.each(["0", "99", "60001", "2.5", "later"])(
    "rejects an invalid request timeout: %s",
    (requestTimeoutMs) => {
      expect(() =>
        resolveRuntimeConfig(
          {
            buildMode: "production",
            platform: "h5",
          },
          {
            apiBaseUrlLocal: undefined,
            apiBaseUrlProduction: undefined,
            apiBaseUrlStaging: undefined,
            requestTimeoutMs,
          },
        ),
      ).toThrow(/Request timeout/u);
    },
  );

  it.each([
    ["not-a-url", /absolute URL/u],
    ["https://user:pass@api.example.test", /must not contain credentials/u],
    ["https://api.example.test?token=public", /must not contain credentials/u],
  ])("rejects an unsafe API base URL: %s", (apiBaseUrlProduction, message) => {
    expect(() =>
      resolveRuntimeConfig(
        {
          buildMode: "production",
          platform: "h5",
        },
        {
          apiBaseUrlLocal: undefined,
          apiBaseUrlProduction,
          apiBaseUrlStaging: undefined,
          requestTimeoutMs: undefined,
        },
      ),
    ).toThrow(message);
  });
});
