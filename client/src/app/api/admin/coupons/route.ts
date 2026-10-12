import { created } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { createSchema, listQuery } from "@/server/modules/admin/admin.coupons.schemas";
import { createCoupon, listCoupons } from "@/server/modules/admin/admin.coupons.service";

/** GET /api/admin/coupons (list) and POST /api/admin/coupons (201). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listCoupons(query)),
  POST: adminRoute({ body: createSchema }, ({ body }) => createCoupon(body).then(created)),
});
