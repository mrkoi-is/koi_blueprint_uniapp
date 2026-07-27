import { HttpError, statusToHttpError } from "../../core/http/http-error";
import type { HttpClient, HttpRequest } from "../../core/http/http-client";

export interface UniRequestExecution {
  readonly body?: HttpRequest["body"];
  readonly fail: (failure: { readonly message: string }) => void;
  readonly headers?: HttpRequest["headers"];
  readonly method: NonNullable<HttpRequest["method"]>;
  readonly success: (response: {
    readonly data: unknown;
    readonly statusCode: number;
  }) => void;
  readonly timeoutMs: number;
  readonly url: string;
}

export type UniRequestExecutor = (request: UniRequestExecution) => void;

const executeWithUni: UniRequestExecutor = (request) => {
  uni.request({
    url: request.url,
    method: request.method,
    timeout: request.timeoutMs,
    ...(request.body === undefined ? {} : { data: request.body }),
    ...(request.headers === undefined ? {} : { header: request.headers }),
    success: (response) => {
      request.success({
        data: response.data,
        statusCode: response.statusCode,
      });
    },
    fail: (failure) => {
      request.fail({ message: failure.errMsg });
    },
  });
};

export class UniHttpClient implements HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly execute: UniRequestExecutor = executeWithUni,
  ) {}

  request(request: HttpRequest): Promise<unknown> {
    const url = `${this.baseUrl.replace(/\/$/u, "")}/${request.path.replace(
      /^\//u,
      "",
    )}`;

    return new Promise<unknown>((resolve, reject) => {
      this.execute({
        url,
        method: request.method ?? "GET",
        timeoutMs: this.timeoutMs,
        ...(request.body === undefined ? {} : { body: request.body }),
        ...(request.headers === undefined ? {} : { headers: request.headers }),
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(response.data);
            return;
          }
          reject(statusToHttpError(response.statusCode));
        },
        fail: (failure) => {
          const code = failure.message.includes("timeout")
            ? "TIMEOUT"
            : "NETWORK";
          reject(new HttpError(code, failure.message));
        },
      });
    });
  }
}
