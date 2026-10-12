import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { optionalText, queryBool, safeUrl, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/banners (extracted from server admin.banners.ts).

export const listQuery = paginationQuery.extend({
  q: searchTerm, // title contains
  isActive: queryBool.optional(),
  sort: z.enum(["sortOrder_asc", "createdAt_desc", "title_asc"]).default("sortOrder_asc"),
});

/** POST body (Express `base`). */
export const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: optionalText(240),
  imageUrl: safeUrl,
  ctaLabel: optionalText(40),
  ctaHref: safeUrl.nullish(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});
export const updateSchema = createSchema.partial();
export const reorderSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) });

export type ListQuery = z.infer<typeof listQuery>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
