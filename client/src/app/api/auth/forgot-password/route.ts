import { methods, route } from "@/server/http/route";
import { sensitiveLimiter } from "@/server/http/rate-limit";
import { forgotPasswordSchema } from "@/server/modules/auth/auth.schemas";
import { requestPasswordReset } from "@/server/modules/auth/auth.service";

/** POST /api/auth/forgot-password */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  POST: route({ limiter: sensitiveLimiter, body: forgotPasswordSchema }, async (ctx) => {
    await requestPasswordReset(ctx.body.email);
    return { message: "A password reset link has been sent to your email." };
  }),
});
