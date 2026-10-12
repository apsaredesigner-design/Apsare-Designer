/**
 * Product helpers (pure): list constants, merchandising flags and server limits
 * (docs/API.md → Admin → Products).
 *
 *   useAdminList<AdminProductListItem>(PRODUCTS_PATH, { filters: PRODUCT_FILTERS, defaultSort: "createdAt_desc" })
 *   await adminApi.products.create({ ...input, isActive: false });     // draft
 *
 * An ACTIVE product needs ≥ 1 variant and ≥ 1 image (400 PRODUCT_INCOMPLETE).
 * discountPercent is computed by the server; preview it with `discountPercent()` from "@/lib/pricing".
 */
import type { SkipReason } from "../types";

export const PRODUCTS_PATH = "/admin/products";
export const PRODUCT_FLAGS = ["isNewArrival", "isTrending", "isBestSeller", "isDealOfDay"] as const;
export type ProductFlag = (typeof PRODUCT_FLAGS)[number];
export const PRODUCT_FLAG_LABEL: Record<ProductFlag, string> = {
  isNewArrival: "New arrival",
  isTrending: "Trending",
  isBestSeller: "Best seller",
  isDealOfDay: "Deal of the day",
};
export const PRODUCT_FILTERS = ["categoryId", "isActive", "stock", ...PRODUCT_FLAGS] as const;

/** Server limits (admin.products.schemas.ts). */
export const PRODUCT_LIMITS = { images: 15, variants: 200, specs: 30, specKey: 60, specValue: 500 } as const;

export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
  NO_VARIANTS: "no variants",
  NO_IMAGES: "no images",
};
