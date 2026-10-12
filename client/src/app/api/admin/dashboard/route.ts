import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { getDashboard } from "@/server/modules/admin/admin.dashboard.service";

/** GET /api/admin/dashboard → AdminDashboardStats. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({}, () => getDashboard()),
});
