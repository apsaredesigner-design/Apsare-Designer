import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { pincodeParams, pincodeUpdate } from "@/server/modules/admin/admin.settings.schemas";
import { deletePincode, updatePincode } from "@/server/modules/admin/admin.settings.service";

/** PATCH / DELETE /api/admin/settings/pincodes/:pincode (404 when not listed; DELETE 204). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: pincodeParams, body: pincodeUpdate }, ({ params, body }) => updatePincode(params.pincode, body)),
  DELETE: adminRoute({ params: pincodeParams }, ({ params }) => deletePincode(params.pincode).then(noContent)),
});
