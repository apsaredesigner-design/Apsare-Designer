import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { updateSchema } from "@/server/modules/admin/admin.banners.schemas";
import { deleteBanner, getBanner, updateBanner } from "@/server/modules/admin/admin.banners.service";
import { idParams } from "@/server/modules/admin/admin.shared";

/** GET / PATCH / DELETE /api/admin/banners/:id (unknown id → 404; DELETE 204). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getBanner(params.id)),
  PATCH: adminRoute({ params: idParams, body: updateSchema }, ({ params, body }) => updateBanner(params.id, body)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteBanner(params.id).then(noContent)),
});
