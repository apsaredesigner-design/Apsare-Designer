import { methods, route } from "@/server/http/route";

/** GET /api/health → { ok: true } (public; apiLimiter applies, like every /api route). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({}, () => ({ ok: true })),
});
