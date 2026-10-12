/**
 * Normalises anything thrown by fetch/api() into an ApiError with a friendly message.
 *
 *   catch (e) { const err = toApiError(e); toast.error(errorMessage(err)); }
 */
import { ApiError } from "@/lib/api";

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof TypeError) return new ApiError(0, "Can't reach the server. Check your connection and try again.", "NETWORK");
  return new ApiError(0, e instanceof Error ? e.message : "Something went wrong.");
}

/** A short user-facing message for common status codes. */
export function errorMessage(err: ApiError): string {
  switch (err.status) {
    case 400:
      return err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message;
    case 401:
      return "Your session has ended. Please sign in again.";
    case 403:
      return err.code === "CSRF" ? "This request was blocked for security reasons. Reload the page and try again." : "You don't have permission to do that.";
    case 404:
      return "That item no longer exists.";
    case 413:
      return "That file is too large.";
    case 429:
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return err.status >= 500 ? "The server had a problem. Please try again." : err.message;
  }
}
