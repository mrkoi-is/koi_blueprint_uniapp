import { HttpError } from "../../core/http/http-error";
import type { HttpClient } from "../../core/http/http-client";
import type { paths } from "./generated/welcome";
import type { WelcomeMessage, WelcomeRepository } from "./model";

type WelcomeDto =
  paths["/welcome"]["get"]["responses"][200]["content"]["application/json"];

function parseWelcomeDto(value: unknown): WelcomeDto {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  if (typeof record.title !== "string" || typeof record.body !== "string") {
    throw new HttpError(
      "INVALID_RESPONSE",
      "The welcome response does not match its contract.",
    );
  }
  return { title: record.title, body: record.body };
}

export class RemoteWelcomeRepository implements WelcomeRepository {
  constructor(private readonly http: HttpClient) {}

  async load(): Promise<WelcomeMessage> {
    const dto = parseWelcomeDto(await this.http.request({ path: "/welcome" }));
    return { title: dto.title, body: dto.body };
  }
}
