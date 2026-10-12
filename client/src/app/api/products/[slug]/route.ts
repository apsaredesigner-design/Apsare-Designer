import { route, methods } from "@/server/http/route";
import { slugParams } from "@/server/modules/products/products.schemas";
import { getProduct } from "@/server/modules/products/products.service";

/** GET /api/products/:slug → product detail (optionalAuth for inWishlist, publicCache). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ auth: "optional", params: slugParams, cache: "public" }, ({ params, user }) => getProduct(params.slug, user?.id)),
});
