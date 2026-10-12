import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { statusSchema } from "@/server/modules/admin/admin.products.schemas";
import { setProductStatus } from "@/server/modules/admin/admin.products.service";

/** PATCH /api/admin/products/:id/status { isActive } → { id, isActive } (400 PRODUCT_INCOMPLETE). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: idParams, body: statusSchema }, ({ params, body }) => setProductStatus(params.id, body.isActive)),
});
