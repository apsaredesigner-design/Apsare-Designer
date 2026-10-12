import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { exportQuery } from "@/server/modules/admin/admin.orders.schemas";
import { exportOrdersCsv } from "@/server/modules/admin/admin.orders.service";

/**
 * GET /api/admin/orders/export.csv: the list filters without paging, streamed as CSV
 * (BOM, CRLF, formula-escaped cells). Static folder, so it wins over [orderNumber].
 */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: exportQuery }, ({ query }) => exportOrdersCsv(query)),
});
