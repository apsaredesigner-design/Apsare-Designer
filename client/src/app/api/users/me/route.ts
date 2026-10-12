import { userGuard } from "@/server/http/guards";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { guardedMethods, route } from "@/server/http/route";
import { updateProfileSchema } from "@/server/modules/users/users.schemas";
import { updateProfile } from "@/server/modules/users/users.service";

/** PATCH /api/users/me → { user } (signed in). */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  PATCH: route({ ...userGuard, limiter: sensitiveLimiter, body: updateProfileSchema }, async (ctx) => ({
    user: await updateProfile(ctx.user.id, ctx.body),
  })),
});
