import { describe, expect, it } from "vitest";

import type { WelcomeRepository } from "../../src/features/home/model";
import { LoadHome } from "../../src/features/home/use-home";

describe("LoadHome", () => {
  it("returns a ready state with the repository value", async () => {
    const repository: WelcomeRepository = {
      load: async () =>
        Promise.resolve({
          title: "Koi",
          body: "Ready",
        }),
    };
    const useCase = new LoadHome(repository);

    await expect(useCase.execute()).resolves.toEqual({
      status: "ready",
      welcome: {
        title: "Koi",
        body: "Ready",
      },
    });
  });

  it("maps Error failures to a recoverable state", async () => {
    const repository: WelcomeRepository = {
      load: async () => Promise.reject(new Error("Offline")),
    };
    const useCase = new LoadHome(repository);

    await expect(useCase.execute()).resolves.toEqual({
      status: "error",
      message: "Offline",
    });
  });

  it("maps unknown failures without leaking an untyped value", async () => {
    const repository: WelcomeRepository = {
      // Third-party promises can reject arbitrary values; this verifies narrowing.
      load: async () => Promise.reject("offline"),
    };
    const useCase = new LoadHome(repository);

    await expect(useCase.execute()).resolves.toEqual({
      status: "error",
      message: "Unable to load the application.",
    });
  });
});
