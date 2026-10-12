import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { getProfile } from "@/server/modules/users/users.service";

// Express: router.use(requireAuth)
/** GET /api/users/me/profile → { user } (signed in). */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  GET: route(userGuard, async (ctx) => ({ user: await getProfile(ctx.user.id) })),
});
