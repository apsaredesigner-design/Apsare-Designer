import { created, methods, route } from "@/server/http/route";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { issueSession } from "@/server/http/session";
import { signupSchema } from "@/server/modules/auth/auth.schemas";
import { signup } from "@/server/modules/auth/auth.service";

/** POST /api/auth/signup → 201 { user } + session cookie. */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({ limiter: sensitiveLimiter, body: signupSchema }, async (ctx) => {
    const user = await signup(ctx.body);
    issueSession(ctx, user, ctx.body.remember);
    return created({ user });
  }),
});
