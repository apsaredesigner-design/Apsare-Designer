// The Express router-level middleware (`router.use(...)`) of each guarded router, as
// route() options. Spread one into every route() of that router's files and pass it
// to guardedMethods(), so unimplemented methods and unknown sub-paths run it before
// the 404, as in Express. The admin router is `adminRoute` / `adminMethods`.
import { cartLimiter, uploadLimiter } from "./rate-limit";

/** users, addresses, orders, and payments after its public GETs: `router.use(requireAuth)`. */
export const userGuard = { auth: "user" } as const;

/** cart and wishlist: `router.use(requireAuth, noStore, cartLimiter)`. */
export const cartGuard = { auth: "user", cache: "no-store", limiter: cartLimiter } as const;

/** uploads: `router.use(requireAuth, requireAdmin, uploadLimiter)` (no adminLimiter, no audit). */
export const uploadGuard = { auth: "admin", limiter: uploadLimiter } as const;
