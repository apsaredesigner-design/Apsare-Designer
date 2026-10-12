import type { z } from "zod";
import { methods, route, throwNotFound, type Handler, type MethodHandlers, type RouteHandler, type RouteOptions } from "../../http/route";
import { adminLimiter } from "../../http/rate-limit";
import { auditAdminMutations } from "./admin.audit.service";

type Schema = z.ZodType | undefined;

/** route() options for an admin route: everything except `auth` and `after`, which adminRoute sets. */
export type AdminRouteOptions<P extends Schema, Q extends Schema, B extends Schema> = Omit<RouteOptions<"admin", P, Q, B>, "auth" | "after">;

/**
 * The Express admin router (`router.use(requireAuth, requireAdmin, adminLimiter,
 * auditAdminMutations)`) for one handler:
 * `route({ auth: "admin", limiter: [adminLimiter, ...options.limiter], after: auditAdminMutations, ...options }, handler)`.
 * `ctx.user` is the admin. Not for /api/uploads (that router had uploadLimiter, no adminLimiter, no audit).
 *
 *   export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
 *     GET: adminRoute({ params: idParams }, ({ params }) => getBanner(params.id)),
 *   });
 */
export function adminRoute<P extends Schema = undefined, Q extends Schema = undefined, B extends Schema = undefined>(
  options: AdminRouteOptions<P, Q, B>,
  handler: Handler<"admin", P, Q, B>,
): RouteHandler {
  const extra = options.limiter === undefined ? [] : [options.limiter].flat();
  return route<"admin", P, Q, B>({ ...options, auth: "admin", limiter: [adminLimiter, ...extra], after: auditAdminMutations }, handler);
}

/**
 * `methods()` for every /api/admin/** route.ts: an unimplemented method goes through the
 * admin router's middleware before the 404, as in Express (guest 401, customer 403,
 * adminLimiter counted, and an admin's POST/PUT/PATCH/DELETE 404 is audit-logged).
 * `adminMethods({})` is the whole of `app/api/admin/[[...slug]]/route.ts`.
 */
export function adminMethods(defs: Partial<MethodHandlers>): MethodHandlers {
  return methods(defs, adminRoute({}, throwNotFound));
}
