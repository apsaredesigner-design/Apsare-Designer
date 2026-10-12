import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { updateSchema } from "@/server/modules/admin/admin.products.schemas";
import { deleteProduct, getProductOr404, updateProduct } from "@/server/modules/admin/admin.products.service";

/** /api/admin/products/:id: detail, update, delete (200 { id, deleted: "soft" | "hard" }). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getProductOr404(params.id)),
  PATCH: adminRoute({ params: idParams, body: updateSchema }, ({ params, body }) => updateProduct(params.id, body)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteProduct(params.id)),
});
