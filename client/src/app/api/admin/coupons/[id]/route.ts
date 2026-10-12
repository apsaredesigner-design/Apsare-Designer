import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { updateSchema } from "@/server/modules/admin/admin.coupons.schemas";
import { deleteCoupon, getCoupon, updateCoupon } from "@/server/modules/admin/admin.coupons.service";
import { idParams } from "@/server/modules/admin/admin.shared";

/** GET / PATCH / DELETE /api/admin/coupons/:id. DELETE is 204, or 409 COUPON_IN_USE. */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getCoupon(params.id)),
  PATCH: adminRoute({ params: idParams, body: updateSchema }, ({ params, body }) => updateCoupon(params.id, body)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteCoupon(params.id).then(noContent)),
});
