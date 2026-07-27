export type HttpErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export class HttpError extends Error {
  override readonly name = "HttpError";

  constructor(
    readonly code: HttpErrorCode,
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
  }
}

export function statusToHttpError(statusCode: number): HttpError {
  if (statusCode === 401) {
    return new HttpError(
      "UNAUTHORIZED",
      "Authentication is required.",
      statusCode,
    );
  }
  if (statusCode === 403) {
    return new HttpError(
      "FORBIDDEN",
      "This action is not permitted.",
      statusCode,
    );
  }
  if (statusCode === 404) {
    return new HttpError(
      "NOT_FOUND",
      "The requested resource was not found.",
      statusCode,
    );
  }
  if (statusCode >= 500) {
    return new HttpError(
      "SERVER",
      "The service is temporarily unavailable.",
      statusCode,
    );
  }
  return new HttpError(
    "UNKNOWN",
    `Unexpected HTTP status ${statusCode}.`,
    statusCode,
  );
}
