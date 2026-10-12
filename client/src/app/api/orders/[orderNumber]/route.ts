import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { orderParams } from "@/server/modules/orders/orders.schemas";
import { getOrderDetail } from "@/server/modules/orders/orders.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** GET /api/orders/:orderNumber: my order with items, history and payments. */
  GET: route({ ...userGuard, params: orderParams }, ({ user, params }) => getOrderDetail(user.id, params.orderNumber)),
});
