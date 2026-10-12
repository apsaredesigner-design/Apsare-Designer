import { route, methods } from "@/server/http/route";
import { slugParams } from "@/server/modules/products/products.schemas";
import { getSimilar } from "@/server/modules/products/products.service";

/** GET /api/products/:slug/similar → similar products (publicCache). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ params: slugParams, cache: "public" }, ({ params }) => getSimilar(params.slug)),
});
