import { cartGuard } from "@/server/http/guards";
import { cartLimiter, couponLimiter } from "@/server/http/rate-limit";
import { created, guardedMethods, route } from "@/server/http/route";
import { addBody, cartQuery } from "@/server/modules/cart/cart.schemas";
import { addItem, capNotice, clearCart, loadCart } from "@/server/modules/cart/cart.service";

// Express: router.use(requireAuth, noStore, cartLimiter)
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** GET /api/cart?coupon=CODE: an invalid coupon never fails (coupon null + couponError). */
  GET: route({ ...cartGuard, limiter: [cartLimiter, couponLimiter], query: cartQuery }, ({ user, query }) => loadCart(user.id, query.coupon)),

  /** POST /api/cart { variantId, quantity }: merges with an existing line, capped at stock and 10. */
  POST: route({ ...cartGuard, body: addBody }, async ({ user, body }) => {
    const result = await addItem(user.id, body.variantId, body.quantity);
    return created({ ...(await loadCart(user.id)), added: result, notice: capNotice(result) });
  }),

  /** DELETE /api/cart: clear. */
  DELETE: route(cartGuard, async ({ user }) => {
    await clearCart(user.id);
    return loadCart(user.id);
  }),
});
