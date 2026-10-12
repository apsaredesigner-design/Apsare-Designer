import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/reviews (extracted from server admin.reviews.ts).

export const listQuery = paginationQuery
  .extend({
    q: searchTerm, // comment, product name/code, or reviewer name/email contains
    productId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(), // exact
    minRating: z.coerce.number().int().min(1).max(5).optional(),
    maxRating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(["createdAt_desc", "createdAt_asc", "rating_asc", "rating_desc"]).default("createdAt_desc"),
  })
  .refine((q) => !q.minRating || !q.maxRating || q.minRating <= q.maxRating, { path: ["maxRating"], message: "maxRating must be ≥ minRating" });

export type ListQuery = z.infer<typeof listQuery>;
