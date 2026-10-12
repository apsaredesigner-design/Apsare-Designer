import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { updateSchema } from "@/server/modules/admin/admin.categories.schemas";
import { deleteCategory, getCategory, updateCategory } from "@/server/modules/admin/admin.categories.service";

/** /api/admin/categories/:id: detail, update (409 CATEGORY_CYCLE), delete (204, 409 CATEGORY_IN_USE). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getCategory(params.id)),
  PATCH: adminRoute({ params: idParams, body: updateSchema }, ({ params, body }) => updateCategory(params.id, body)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteCategory(params.id).then(noContent)),
});
