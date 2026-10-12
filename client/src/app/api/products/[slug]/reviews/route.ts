import { created, methods, route } from "@/server/http/route";
import { reviewLimiter } from "@/server/http/rate-limit";
import { createReviewBody, reviewsQuery, slugParams } from "@/server/modules/products/products.schemas";
import { createReview, listReviews } from "@/server/modules/products/products.service";

/**
 * GET  /api/products/:slug/reviews → paginated reviews (publicCache).
 * POST /api/products/:slug/reviews → 201 review (requireAuth, reviewLimiter; verified purchase only).
 */
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ params: slugParams, query: reviewsQuery, cache: "public" }, ({ params, query }) => listReviews(params.slug, query)),
  POST: route({ auth: "user", limiter: reviewLimiter, params: slugParams, body: createReviewBody }, ({ params, user, body }) =>
    createReview(params.slug, user.id, body).then(created),
  ),
});
