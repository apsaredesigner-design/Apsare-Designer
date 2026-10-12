import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { statusSchema } from "@/server/modules/admin/admin.customers.schemas";
import { setCustomerStatus } from "@/server/modules/admin/admin.customers.service";

/** PATCH /api/admin/customers/:id/status { isActive } → { id, isActive } (400 SELF_DEACTIVATION, 409 LAST_ADMIN). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: idParams, body: statusSchema }, ({ user, params, body }) => setCustomerStatus(user.id, params.id, body.isActive)),
});
