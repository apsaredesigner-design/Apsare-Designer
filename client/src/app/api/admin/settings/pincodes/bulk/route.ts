import { created, staticTwin } from "@/server/http/route";
import { adminRoute } from "@/server/modules/admin/admin.route";
import { bulkSchema } from "@/server/modules/admin/admin.settings.schemas";
import { bulkAddPincodes } from "@/server/modules/admin/admin.settings.service";
import * as byPincode from "../[pincode]/route";

/** POST /api/admin/settings/pincodes/bulk { pincodes }: 201 { received, added, skipped }. Other methods fall through to `/pincodes/:pincode`. */
export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byPincode, { pincode: "bulk" }, {
  POST: adminRoute({ body: bulkSchema }, ({ body }) => bulkAddPincodes(body).then(created)),
});
