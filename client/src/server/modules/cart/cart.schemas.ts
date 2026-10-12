import { z } from "zod";
import { idParam } from "../../utils/params";

/** Hard cap per cart line, regardless of stock. */
export const MAX_QTY_PER_LINE = 10;

// Bodies take JSON numbers only (z.coerce would turn `true` into 1). Decimals, 0 and negatives → 400.
const bodyId = z.number().int().positive();
const qty = z.number().int().min(1).max(MAX_QTY_PER_LINE);

export const cartQuery = z.object({ coupon: z.string().trim().max(40).optional() });
export type CartQuery = z.infer<typeof cartQuery>;

export const itemParams = z.object({ itemId: idParam });
export type ItemParams = z.infer<typeof itemParams>;

export const addBody = z.object({ variantId: bodyId, quantity: qty.default(1) });
export type AddBody = z.infer<typeof addBody>;

export const patchBody = z.object({ quantity: qty });
export type PatchBody = z.infer<typeof patchBody>;

export const mergeBody = z.object({
  items: z
    .array(z.object({ variantId: bodyId, quantity: z.number().int().min(1).max(100) }))
    .max(50),
});
export type MergeBody = z.infer<typeof mergeBody>;
