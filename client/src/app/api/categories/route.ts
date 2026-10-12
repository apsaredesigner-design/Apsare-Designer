import { route, methods } from "@/server/http/route";
import { getCategoryTree } from "@/server/modules/categories/categories.service";

/** GET /api/categories → the public category tree (publicCache). */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ cache: "public" }, () => getCategoryTree()),
});
