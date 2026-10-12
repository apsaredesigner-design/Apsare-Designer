import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { orderParams, statusSchema } from "@/server/modules/admin/admin.orders.schemas";
import { updateOrderStatus } from "@/server/modules/admin/admin.orders.service";

/**
 * PATCH /api/admin/orders/:orderNumber/status { status, note? }: moves the order along
 * ORDER_TRANSITIONS (409 INVALID_STATUS_TRANSITION), CANCELLED via cancelOrderTx,
 * COD → PAID on DELIVERED. Returns the detail.
 */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: orderParams, body: statusSchema }, ({ params, body }) =>
    updateOrderStatus(params.orderNumber, body.status, body.note),
  ),
});
