/**
 * Admin audit log: filter keys and badge tones for HTTP methods and statuses.
 */
import type { BadgeTone } from "@/components/admin/StatusBadge";

export const AUDIT_FILTERS = ["adminId", "from", "to"] as const;

export const METHOD_TONE: Record<string, BadgeTone> = { POST: "success", PUT: "info", PATCH: "gold", DELETE: "danger" };

export function httpStatusTone(status: number): BadgeTone {
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  return "success";
}
