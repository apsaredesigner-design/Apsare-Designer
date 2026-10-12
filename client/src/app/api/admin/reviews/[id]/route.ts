import { noContent } from "@/server/http/route";
import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { idParams } from "@/server/modules/admin/admin.shared";
import { deleteReview, getReview } from "@/server/modules/admin/admin.reviews.service";

/** /api/admin/reviews/:id: detail, delete (204; recomputes the product rating). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ params: idParams }, ({ params }) => getReview(params.id)),
  DELETE: adminRoute({ params: idParams }, ({ params }) => deleteReview(params.id).then(noContent)),
});
