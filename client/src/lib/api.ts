/** Same-origin Route Handlers by default. Browser-only: Server Components use `@/server/queries`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Mirrors the server's `{ error: { message, code?, details? } }` response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details: ApiErrorDetail[] = [],
  ) {
    super(message);
  }

  /** Field errors keyed by path (e.g. "body.email" -> "email"), handy for forms. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.path.replace(/^(body|query|params)\./, ""), d.message]));
  }
}

/** Thin fetch wrapper for the /api Route Handlers. Sends the httpOnly auth cookie. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.message ?? res.statusText, err?.code, err?.details ?? []);
  }
  return body as T;
}
