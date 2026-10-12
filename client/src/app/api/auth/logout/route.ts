import { methods, route } from "@/server/http/route";
import { clearSession } from "@/server/http/session";

/** POST /api/auth/logout → { ok: true } and clears the session cookie. */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({}, (ctx) => {
    clearSession(ctx);
    return { ok: true };
  }),
});
