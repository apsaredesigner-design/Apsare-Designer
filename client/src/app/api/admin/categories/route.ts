import { created } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { createSchema, listQuery } from "@/server/modules/admin/admin.categories.schemas";
import { createCategory, listCategories } from "@/server/modules/admin/admin.categories.service";

/** /api/admin/categories: list (paginated) and create (201). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listCategories(query)),
  POST: adminRoute({ body: createSchema }, ({ body }) => createCategory(body).then(created)),
});
