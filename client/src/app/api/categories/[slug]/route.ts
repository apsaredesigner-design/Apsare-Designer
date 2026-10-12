import { route, methods } from "@/server/http/route";
import { slugParams } from "@/server/modules/categories/categories.schemas";
import { getCategoryBySlug } from "@/server/modules/categories/categories.service";

/** GET /api/categories/:slug → category detail (validate params, publicCache). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ params: slugParams, cache: "public" }, ({ params }) => getCategoryBySlug(params.slug)),
});
