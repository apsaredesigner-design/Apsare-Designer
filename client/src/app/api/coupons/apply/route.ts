import { couponLimiter } from "@/server/http/rate-limit";
import { methods, route } from "@/server/http/route";
import { applyBody } from "@/server/modules/coupons/coupons.schemas";
import { applyCoupon } from "@/server/modules/coupons/coupons.service";

export const { GET, POST, PUT, PATCH, DELETE } = methods({
  /** POST /api/coupons/apply { code }: validates against the CURRENT server-side cart. Express order: requireAuth, couponLimiter, noStore (a 429 has no Cache-Control). */
  POST: route({ auth: "user", limiter: couponLimiter, cache: "no-store", cacheAfterLimiters: true, body: applyBody }, ({ user, body }) => applyCoupon(user.id, body.code)),
});
