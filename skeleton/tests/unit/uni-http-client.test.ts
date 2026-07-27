import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../../src/core/http/http-error";
import {
  UniHttpClient,
  type UniRequestExecution,
  type UniRequestExecutor,
} from "../../src/platform/uni/uni-http-client";

interface StubUniRequestOptions {
  readonly fail: (failure: { readonly errMsg: string }) => void;
  readonly success: (response: {
    readonly data: unknown;
    readonly statusCode: number;
  }) => void;
}

function captureRequest(): {
  readonly execute: UniRequestExecutor;
  readonly request: () => UniRequestExecution;
} {
  let captured: UniRequestExecution | undefined;

  return {
    execute: (request) => {
      captured = request;
    },
    request: () => {
      if (captured === undefined) {
        throw new Error("Expected the request executor to be called.");
      }
      return captured;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UniHttpClient", () => {
  it("normalizes the URL and resolves a successful response", async () => {
    const captured = captureRequest();
    const client = new UniHttpClient(
      "https://api.example.test/",
      2500,
      captured.execute,
    );
    const result = client.request({
      body: { query: "koi" },
      headers: { "X-Trace": "test" },
      method: "POST",
      path: "/search",
    });
    const request = captured.request();

    expect(request).toMatchObject({
      body: { query: "koi" },
      headers: { "X-Trace": "test" },
      method: "POST",
      timeoutMs: 2500,
      url: "https://api.example.test/search",
    });
    request.success({
      data: { ok: true },
      statusCode: 201,
    });

    await expect(result).resolves.toEqual({ ok: true });
  });

  it("maps non-success status codes", async () => {
    const captured = captureRequest();
    const client = new UniHttpClient(
      "https://api.example.test",
      1000,
      captured.execute,
    );
    const result = client.request({ path: "/private" });

    captured.request().success({
      data: undefined,
      statusCode: 403,
    });

    await expect(result).rejects.toEqual(
      new HttpError("FORBIDDEN", "This action is not permitted.", 403),
    );
  });

  it.each([
    ["request:fail timeout", "TIMEOUT"],
    ["request:fail network unavailable", "NETWORK"],
  ] as const)("maps %s to %s", async (message, code) => {
    const captured = captureRequest();
    const client = new UniHttpClient(
      "https://api.example.test",
      1000,
      captured.execute,
    );
    const result = client.request({ path: "/welcome" });

    captured.request().fail({ message });

    await expect(result).rejects.toMatchObject({
      code,
      message,
    });
  });

  it("uses uni.request as the production executor", async () => {
    const request = vi.fn((options: StubUniRequestOptions) => {
      options.success({
        data: "ok",
        statusCode: 200,
      });
    });
    vi.stubGlobal("uni", { request });
    const client = new UniHttpClient("https://api.example.test", 1000);

    await expect(client.request({ path: "health" })).resolves.toBe("ok");
    expect(request).toHaveBeenCalledOnce();
  });

  it("normalizes a production uni.request failure", async () => {
    const request = vi.fn((options: StubUniRequestOptions) => {
      options.fail({
        errMsg: "request:fail offline",
      });
    });
    vi.stubGlobal("uni", { request });
    const client = new UniHttpClient("https://api.example.test", 1000);

    await expect(client.request({ path: "health" })).rejects.toMatchObject({
      code: "NETWORK",
      message: "request:fail offline",
    });
  });
});
