import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { roleSchema } from "@/server/modules/admin/admin.customers.schemas";
import { setCustomerRole } from "@/server/modules/admin/admin.customers.service";

/** PATCH /api/admin/customers/:id/role { role } → { id, role, isActive } (400 SELF_ROLE_CHANGE, 409 LAST_ADMIN). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: idParams, body: roleSchema }, ({ user, params, body }) => setCustomerRole(user.id, params.id, body.role)),
});
