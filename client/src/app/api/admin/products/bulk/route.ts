import { staticTwin } from "@/server/http/route";
import { adminRoute } from "@/server/modules/admin/admin.route";
import { bulkSchema } from "@/server/modules/admin/admin.products.schemas";
import { bulkAction } from "@/server/modules/admin/admin.products.service";
import * as byId from "../[id]/route";

/** POST /api/admin/products/bulk { ids, action: activate | deactivate | delete } (activate reports `skipped`). Other methods fall through to `/:id`. */
export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byId, { id: "bulk" }, {
  POST: adminRoute({ body: bulkSchema }, ({ body }) => bulkAction(body)),
});
