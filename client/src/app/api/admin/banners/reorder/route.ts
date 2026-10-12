import { staticTwin } from "@/server/http/route";
import { adminRoute } from "@/server/modules/admin/admin.route";
import { reorderSchema } from "@/server/modules/admin/admin.banners.schemas";
import { reorderBanners } from "@/server/modules/admin/admin.banners.service";
import * as byId from "../[id]/route";

/** PUT /api/admin/banners/reorder { ids }: sortOrder = position; unknown id → 400. Other methods fall through to `/:id`. */
export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byId, { id: "reorder" }, {
  PUT: adminRoute({ body: reorderSchema }, ({ body }) => reorderBanners(body)),
});
