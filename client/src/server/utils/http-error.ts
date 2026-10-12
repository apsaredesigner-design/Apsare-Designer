export interface ErrorDetail {
  path: string;
  message: string;
}

const DEFAULT_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  501: "NOT_IMPLEMENTED",
};

/**
 * Throw this from any handler/service. The error middleware turns it into
 * `{ error: { message, code, details? } }` with the given HTTP status.
 */
export class HttpError extends Error {
  public code: string;

  constructor(
    public status: number,
    message: string,
    code?: string,
    public details?: ErrorDetail[],
  ) {
    super(message);
    this.code = code ?? DEFAULT_CODES[status] ?? (status >= 500 ? "INTERNAL" : "ERROR");
  }
}
