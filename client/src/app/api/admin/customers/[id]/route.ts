import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { getCustomer } from "@/server/modules/admin/admin.customers.service";

/** GET /api/admin/customers/:id: detail with addresses, orders and stats (never the password hash). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getCustomer(params.id)),
});
