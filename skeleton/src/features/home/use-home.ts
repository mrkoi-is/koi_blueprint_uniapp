import type { WelcomeMessage, WelcomeRepository } from "./model";

export type LoadHomeResult =
  | {
      readonly status: "ready";
      readonly welcome: WelcomeMessage;
    }
  | {
      readonly status: "error";
      readonly message: string;
    };

export class LoadHome {
  constructor(private readonly repository: WelcomeRepository) {}

  async execute(): Promise<LoadHomeResult> {
    try {
      const welcome = await this.repository.load();
      return {
        status: "ready",
        welcome,
      };
    } catch (cause: unknown) {
      return {
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Unable to load the application.",
      };
    }
  }
}
