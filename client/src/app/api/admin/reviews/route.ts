import { adminMethods, adminRoute } from "@/server/modules/admin/admin.route";
import { listQuery } from "@/server/modules/admin/admin.reviews.schemas";
import { listReviews } from "@/server/modules/admin/admin.reviews.service";

/** GET /api/admin/reviews (paginated, filterable). */
export const { GET, POST, PUT, PATCH, DELETE } = adminMethods({
  GET: adminRoute({ query: listQuery }, ({ query }) => listReviews(query)),
});
