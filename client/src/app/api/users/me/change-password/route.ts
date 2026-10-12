import { userGuard } from "@/server/http/guards";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { guardedMethods, route } from "@/server/http/route";
import { issueSession } from "@/server/http/session";
import { changePasswordSchema } from "@/server/modules/users/users.schemas";
import { changePassword } from "@/server/modules/users/users.service";

/** POST /api/users/me/change-password → revokes older sessions and re-issues this one. */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  POST: route({ ...userGuard, limiter: sensitiveLimiter, body: changePasswordSchema }, async (ctx) => {
    await changePassword(ctx.user.id, ctx.body);
    // Every older session (other devices included) is now revoked; keep this one logged in.
    issueSession(ctx, ctx.user);
    return { message: "Password updated" };
  }),
});
