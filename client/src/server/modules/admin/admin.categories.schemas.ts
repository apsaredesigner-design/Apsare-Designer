import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { optionalText, queryBool, safeUrl, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/categories (extracted from server admin.categories.ts).

export const listQuery = paginationQuery.extend({
  q: searchTerm, // name or slug contains
  // "null" lists top-level categories only
  parentId: z.union([z.literal("null").transform(() => null), z.coerce.number().int().positive()]).optional(),
  isActive: queryBool.optional(),
  sort: z.enum(["sortOrder_asc", "name_asc", "name_desc", "createdAt_desc", "createdAt_asc"]).default("sortOrder_asc"),
});

/** POST body (Express `base`). */
export const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, digits and single hyphens")
    .optional(),
  description: optionalText(2000),
  parentId: z.number().int().positive().nullish(),
  imageUrl: safeUrl.nullish(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuery>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
