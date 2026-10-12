import { route, methods } from "@/server/http/route";
import { getHome } from "@/server/modules/products/products.service";

/** GET /api/products/home → banners + home rails (publicCache). Static, so it wins over [slug]. */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ cache: "public" }, () => getHome()),
});
