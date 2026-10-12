import { route, methods } from "@/server/http/route";
import { searchLimiter } from "@/server/http/rate-limit";
import { listQuery } from "@/server/modules/products/products.schemas";
import { listProducts } from "@/server/modules/products/products.service";

/** GET /api/products → list with search, filters, sort and facets (optionalAuth, searchLimiter, publicCache). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ auth: "optional", limiter: searchLimiter, query: listQuery, cache: "public" }, ({ query, user }) =>
    listProducts(query, user?.id),
  ),
});
