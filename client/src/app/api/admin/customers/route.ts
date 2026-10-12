import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery } from "@/server/modules/admin/admin.customers.schemas";
import { listCustomers } from "@/server/modules/admin/admin.customers.service";

/** GET /api/admin/customers (paginated, with order count and total spent). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listCustomers(query)),
});
