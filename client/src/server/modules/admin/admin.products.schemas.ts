import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { money, optionalText, queryBool, safeUrl, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/products (routes: admin.products.ts, logic: admin.products.service.ts).

export const listQuery = paginationQuery.extend({
  q: searchTerm, // name or code contains
  categoryId: z.coerce.number().int().positive().optional(),
  isActive: queryBool.optional(),
  stock: z.enum(["in", "low", "out"]).optional(),
  isNewArrival: queryBool.optional(),
  isTrending: queryBool.optional(),
  isBestSeller: queryBool.optional(),
  isDealOfDay: queryBool.optional(),
  sort: z
    .enum([
      "createdAt_desc",
      "createdAt_asc",
      "updatedAt_desc",
      "name_asc",
      "name_desc",
      "salePrice_asc",
      "salePrice_desc",
      "discountPercent_desc",
      "soldCount_desc",
    ])
    .default("createdAt_desc"),
});

const imageInput = z.object({
  url: safeUrl,
  publicId: z.string().trim().max(200).nullish(),
  alt: optionalText(200),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

const variantInput = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/, "Letters, digits, . _ - only"),
  size: z.string().trim().min(1).max(30),
  color: z.string().trim().min(1).max(40),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB")
    .nullish(),
  stock: z.number().int().min(0).max(1_000_000),
});

const specs = z
  .record(z.string().trim().min(1).max(60), z.string().trim().max(500))
  .refine((r) => Object.keys(r).length <= 30, "At most 30 specs");

const productBase = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(10_000),
  categoryId: z.number().int().positive(),
  fabric: optionalText(80),
  occasion: optionalText(80),
  pattern: optionalText(80),
  careInstructions: optionalText(2000),
  specs: specs.nullish(),
  mrp: money.positive(),
  salePrice: money.positive(),
  isActive: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isDealOfDay: z.boolean().optional(),
  images: z.array(imageInput).max(15).optional(),
  variants: z.array(variantInput).max(200).optional(),
});

/** Checks that need the whole body: price order and duplicate SKUs / size+colour pairs. */
function checkProduct(p: Partial<z.infer<typeof productBase>>, ctx: z.RefinementCtx) {
  if (p.mrp !== undefined && p.salePrice !== undefined && p.salePrice > p.mrp) {
    ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price cannot exceed MRP" });
  }
  const skus = new Set<string>();
  const combos = new Set<string>();
  p.variants?.forEach((v, i) => {
    const sku = v.sku.toUpperCase();
    const combo = `${v.size.toLowerCase()}|${v.color.toLowerCase()}`;
    if (skus.has(sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
    if (combos.has(combo)) ctx.addIssue({ code: "custom", path: ["variants", i], message: "Duplicate size + colour" });
    skus.add(sku);
    combos.add(combo);
  });
}

export const createSchema = productBase.superRefine(checkProduct);
export const updateSchema = productBase.partial().superRefine(checkProduct);
export type ProductInput = z.infer<typeof updateSchema>;

export const statusSchema = z.object({ isActive: z.boolean() });
export const bulkSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  action: z.enum(["activate", "deactivate", "delete"]),
});

export type ListQuery = z.infer<typeof listQuery>;
export type CreateInput = z.infer<typeof createSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type BulkInput = z.infer<typeof bulkSchema>;
