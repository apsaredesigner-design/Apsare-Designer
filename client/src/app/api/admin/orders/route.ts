import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery } from "@/server/modules/admin/admin.orders.schemas";
import { listOrders } from "@/server/modules/admin/admin.orders.service";

/** GET /api/admin/orders: filtered, paginated order list. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listOrders(query)),
});
