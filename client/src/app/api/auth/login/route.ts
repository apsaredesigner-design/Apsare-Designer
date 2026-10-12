import { methods, route } from "@/server/http/route";
import { loginLimiter } from "@/server/http/rate-limit";
import { issueSession } from "@/server/http/session";
import { loginSchema } from "@/server/modules/auth/auth.schemas";
import { login } from "@/server/modules/auth/auth.service";

/** POST /api/auth/login → { user } + session cookie. */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({ limiter: loginLimiter, body: loginSchema }, async (ctx) => {
    const user = await login(ctx.body);
    issueSession(ctx, user, ctx.body.remember);
    return { user };
  }),
});
