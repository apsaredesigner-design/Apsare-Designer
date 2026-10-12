import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { updateSchema } from "@/server/modules/admin/admin.contact.schemas";
import { deleteContactMessage, updateContactMessage } from "@/server/modules/admin/admin.contact.service";
import { idParams } from "@/server/modules/admin/admin.shared";

/** PATCH { isRead } / DELETE (204) /api/admin/contact-messages/:id; unknown id → 404. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  PATCH: adminRoute({ params: idParams, body: updateSchema }, ({ params, body }) => updateContactMessage(params.id, body)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteContactMessage(params.id).then(noContent)),
});
