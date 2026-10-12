import { created } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { createSchema, listQuery } from "@/server/modules/admin/admin.products.schemas";
import { createProduct, listProducts } from "@/server/modules/admin/admin.products.service";

/** /api/admin/products: list (paginated) and create (201). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listProducts(query)),
  POST: adminRoute({ body: createSchema }, ({ body }) => createProduct(body).then(created)),
});
