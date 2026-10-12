import { methods, route } from "@/server/http/route";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { clearSession } from "@/server/http/session";
import { resetPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { resetPassword } from "@/server/modules/auth/auth.service";

/** POST /api/auth/reset-password → sets the new password and clears the session cookie. */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({ limiter: sensitiveLimiter, body: resetPasswordSchema }, async (ctx) => {
    await resetPassword(ctx.body.token, ctx.body.password);
    clearSession(ctx);
    return { message: "Password updated. Please log in with your new password." };
  }),
});
