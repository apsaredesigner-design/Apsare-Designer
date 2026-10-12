import type { Prisma } from "../../../generated/prisma/client";
import type { AfterContext } from "../../http/route";
import { UNKNOWN_IP } from "../../http/client-ip";
import { prisma } from "../../lib/prisma";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { ListQuery } from "./admin.audit.schemas";

// Admin audit log (extracted from server admin.audit.ts).

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Port of the `auditAdminMutations` middleware as a `route()` `after` hook (adminRoute
 * wires it). Records every mutating admin request once the response is built: who,
 * what, the status and the target id taken from the path. Never the body (or the
 * query string). Non-blocking: a failed insert is console.error'd and never affects
 * the response. `after` only runs past auth and the limiters, so 429s are not recorded.
 */
export function auditAdminMutations(ctx: AfterContext, response: Response): void {
  if (!MUTATING.has(ctx.method) || !ctx.user) return;
  const adminId = ctx.user.id;
  const path = ctx.url.pathname.slice(0, 500);
  // "/api/admin/products/12/images" -> "12"; "/api/admin/settings/pincodes/560001" -> "560001".
  const targetId = path.split("/").slice(4).find((s) => /\d/.test(s))?.slice(0, 64) ?? null;
  // Express stored the socket address; a Route Handler only knows it with TRUST_PROXY=1.
  const ip = ctx.ip && ctx.ip !== UNKNOWN_IP ? ctx.ip.slice(0, 64) : null;

  prisma.adminAuditLog
    .create({ data: { adminId, method: ctx.method, path, status: response.status, targetId, ip } })
    .catch((err: unknown) => console.error("[audit] failed to record admin action", err));
}

/** GET /api/admin/audit-log: newest first, with the acting admin. */
export async function listAuditLog(q: ListQuery) {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(q.adminId ? { adminId: q.adminId } : {}),
    ...(q.from || q.to ? { createdAt: { gte: q.from, lte: q.to } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { admin: { select: { id: true, fullName: true, email: true } } },
      ...toSkipTake(q),
    }),
    prisma.adminAuditLog.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}
