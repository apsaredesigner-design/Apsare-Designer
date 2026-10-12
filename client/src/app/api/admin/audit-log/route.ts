import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery } from "@/server/modules/admin/admin.audit.schemas";
import { listAuditLog } from "@/server/modules/admin/admin.audit.service";

/** GET /api/admin/audit-log: mutating admin requests, newest first, with the admin. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listAuditLog(query)),
});
