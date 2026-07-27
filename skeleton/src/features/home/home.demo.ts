import type { WelcomeMessage, WelcomeRepository } from "./model";

export class DemoWelcomeRepository implements WelcomeRepository {
  constructor(private readonly appTitle: string) {}

  async load(): Promise<WelcomeMessage> {
    return Promise.resolve({
      body: "The Koi uni-app blueprint is running.",
      title: this.appTitle,
    });
  }
}
