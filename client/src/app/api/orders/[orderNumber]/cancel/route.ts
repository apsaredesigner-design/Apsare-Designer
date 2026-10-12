import { cancelLimiter } from "@/server/http/rate-limit";
import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { cancelBody, orderParams } from "@/server/modules/orders/orders.schemas";
import { cancelOrder } from "@/server/modules/orders/orders.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** POST /api/orders/:orderNumber/cancel: only while PLACED or CONFIRMED (cancelOrderTx restores stock and coupon). */
  POST: route({ ...userGuard, limiter: cancelLimiter, params: orderParams, body: cancelBody }, ({ user, params, body }) =>
    cancelOrder(user.id, params.orderNumber, body.reason),
  ),
});
