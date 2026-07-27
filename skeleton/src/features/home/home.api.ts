import { HttpError } from "../../core/http/http-error";
import type { HttpClient } from "../../core/http/http-client";
import type { WelcomeMessage, WelcomeRepository } from "./model";

interface WelcomeDto {
  readonly body: string;
  readonly title: string;
}

function isWelcomeDto(value: unknown): value is WelcomeDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && typeof record.body === "string";
}

export class RemoteWelcomeRepository implements WelcomeRepository {
  constructor(private readonly http: HttpClient) {}

  async load(): Promise<WelcomeMessage> {
    const response = await this.http.request({
      path: "/welcome",
    });

    if (!isWelcomeDto(response)) {
      throw new HttpError(
        "INVALID_RESPONSE",
        "The welcome response does not match its contract.",
      );
    }

    return {
      body: response.body,
      title: response.title,
    };
  }
}
