import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { orderParams } from "@/server/modules/admin/admin.orders.schemas";
import { getOrderOr404 } from "@/server/modules/admin/admin.orders.service";

/** GET /api/admin/orders/:orderNumber: detail plus `nextStatuses`. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: orderParams }, ({ params }) => getOrderOr404(params.orderNumber)),
});
