export interface WelcomeMessage {
  readonly body: string;
  readonly title: string;
}

export interface WelcomeRepository {
  load(): Promise<WelcomeMessage>;
}
