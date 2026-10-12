import { created } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery, pincodeInput } from "@/server/modules/admin/admin.settings.schemas";
import { addPincode, listPincodes } from "@/server/modules/admin/admin.settings.service";

/** GET /api/admin/settings/pincodes (list) and POST (201; 409 CONFLICT when already listed). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listPincodes(query)),
  POST: adminRoute({ body: pincodeInput }, ({ body }) => addPincode(body).then(created)),
});
