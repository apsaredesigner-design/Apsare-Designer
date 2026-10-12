/**
 * Review moderation helpers (pure): list path and filter keys (docs/API.md → Admin → Reviews).
 *
 *   useAdminList<AdminReview>(REVIEWS_PATH, { filters: REVIEW_FILTERS, defaultSort: "createdAt_desc" })
 */

export const REVIEWS_PATH = "/admin/reviews";
export const REVIEW_FILTERS = ["rating", "minRating", "maxRating", "productId", "userId"] as const;
