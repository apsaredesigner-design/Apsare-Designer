import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { searchQuery } from "../../utils/search";
import { slugParams } from "../categories/categories.schemas";

export { slugParams, type SlugParams } from "../categories/categories.schemas";

/** `?size=S,M` → ["S", "M"]. Empty entries are dropped; up to 20 values. */
const csv = z
  .string()
  .max(500)
  .transform((s) => [...new Set(s.split(",").map((v) => v.trim()).filter(Boolean))])
  .pipe(z.array(z.string().max(60)).max(20));

const money = z.coerce.number().min(0).max(10_000_000);
/** "true"/"false"/"1"/"0"/"yes"/"no" (plain z.coerce.boolean() treats "false" as true). */
const flag = z.stringbool();

export const SORTS = ["recommended", "newest", "price_asc", "price_desc", "discount", "popularity", "rating"] as const;

export const listQuery = paginationQuery
  .extend({
    q: searchQuery(100),
    category: slugParams.shape.slug.optional(),
    fabric: csv.optional(),
    occasion: csv.optional(),
    size: csv.optional(),
    color: csv.optional(),
    minPrice: money.optional(),
    maxPrice: money.optional(),
    minDiscount: z.coerce.number().int().min(0).max(100).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    inStock: flag.optional(),
    isNew: flag.optional(),
    trending: flag.optional(),
    bestSeller: flag.optional(),
    deal: flag.optional(),
    sort: z.enum(SORTS).default("recommended"),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "minPrice must not exceed maxPrice",
    path: ["minPrice"],
  });
export type ListQuery = z.infer<typeof listQuery>;

export const reviewsQuery = paginationQuery;

export const createReviewBody = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000).optional(),
});
export type CreateReviewBody = z.infer<typeof createReviewBody>;
