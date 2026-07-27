import { describe, expect, it } from "vitest";

import type { HttpClient, HttpRequest } from "../../src/core/http/http-client";
import { HttpError } from "../../src/core/http/http-error";
import { RemoteWelcomeRepository } from "../../src/features/home/home.api";
import { DemoWelcomeRepository } from "../../src/features/home/home.demo";

class StubHttpClient implements HttpClient {
  lastRequest: HttpRequest | null = null;

  constructor(private readonly response: unknown) {}

  async request(request: HttpRequest): Promise<unknown> {
    this.lastRequest = request;
    return Promise.resolve(this.response);
  }
}

describe("welcome repositories", () => {
  it("builds a deterministic local welcome", async () => {
    const repository = new DemoWelcomeRepository("My uni-app");

    await expect(repository.load()).resolves.toEqual({
      title: "My uni-app",
      body: "The Koi uni-app blueprint is running.",
    });
  });

  it("maps a valid remote DTO to the domain value", async () => {
    const http = new StubHttpClient({
      title: "Remote",
      body: "Connected",
    });
    const repository = new RemoteWelcomeRepository(http);

    await expect(repository.load()).resolves.toEqual({
      title: "Remote",
      body: "Connected",
    });
    expect(http.lastRequest).toEqual({
      path: "/welcome",
    });
  });

  it.each([
    null,
    "wrong",
    {},
    { title: 1, body: "Body" },
    { title: "Title", body: 1 },
  ])("rejects a malformed remote DTO: %j", async (response) => {
    const repository = new RemoteWelcomeRepository(
      new StubHttpClient(response),
    );

    await expect(repository.load()).rejects.toEqual(
      new HttpError(
        "INVALID_RESPONSE",
        "The welcome response does not match its contract.",
      ),
    );
  });
});
