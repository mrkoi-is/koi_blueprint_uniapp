export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
export type HttpRequestBody =
  string | Readonly<Record<string, unknown>> | ArrayBuffer;

export interface HttpRequest {
  readonly body?: HttpRequestBody;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: HttpMethod;
  readonly path: string;
}

export interface HttpClient {
  request(request: HttpRequest): Promise<unknown>;
}
