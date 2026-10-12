import { orderLimiter } from "@/server/http/rate-limit";
import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { listQuery, placeBody } from "@/server/modules/orders/orders.schemas";
import { listOrders, parseIdempotencyKey, placeOrder, placeOrderStatus } from "@/server/modules/orders/orders.service";

// Express: router.use(requireAuth)
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** POST /api/orders: place an order from my cart. Optional `Idempotency-Key` header (201, or 200 on replay). */
  POST: route({ ...userGuard, limiter: orderLimiter, body: placeBody }, async ({ user, body, req, setStatus }) => {
    const result = await placeOrder(user.id, body, parseIdempotencyKey(req.headers.get("idempotency-key")));
    setStatus(placeOrderStatus(result));
    return result;
  }),

  /** GET /api/orders: my orders, newest first. */
  GET: route({ ...userGuard, query: listQuery }, ({ user, query }) => listOrders(user.id, query)),
});
