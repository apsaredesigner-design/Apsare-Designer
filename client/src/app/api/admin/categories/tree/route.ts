import { staticTwin } from "@/server/http/route";
import { adminRoute } from "@/server/modules/admin/admin.route";
import { getCategoryTree } from "@/server/modules/admin/admin.categories.service";
import * as byId from "../[id]/route";

/** GET /api/admin/categories/tree: every category (inactive too) as a nested tree. Other methods fall through to `/:id`. */
export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byId, { id: "tree" }, {
  GET: adminRoute({}, () => getCategoryTree()),
});
