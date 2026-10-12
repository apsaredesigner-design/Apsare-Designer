import { created } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { createSchema, listQuery } from "@/server/modules/admin/admin.banners.schemas";
import { createBanner, listBanners } from "@/server/modules/admin/admin.banners.service";

/** GET /api/admin/banners (list) and POST /api/admin/banners (201; unsafe URLs are 400). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listBanners(query)),
  POST: adminRoute({ body: createSchema }, ({ body }) => createBanner(body).then(created)),
});
