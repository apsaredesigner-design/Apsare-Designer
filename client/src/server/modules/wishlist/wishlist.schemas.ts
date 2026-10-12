import { z } from "zod";
import { idParam } from "../../utils/params";
import { MAX_QTY_PER_LINE } from "../cart/cart.schemas";


export const productParams = z.object({ productId: idParam });
export type ProductParams = z.infer<typeof productParams>;

// Bodies take JSON numbers only (no coercion): decimals, 0, negatives and booleans → 400.
const bodyId = z.number().int().positive();
export const addBody = z.object({ productId: bodyId });
export type AddBody = z.infer<typeof addBody>;

export const moveBody = z.object({ variantId: bodyId, quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE).default(1) });
export type MoveBody = z.infer<typeof moveBody>;
