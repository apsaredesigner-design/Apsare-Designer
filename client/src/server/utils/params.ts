import { z } from "zod";

/** A numeric path param (`/:id`, `/:itemId`, `/:productId`): coerced, positive integer. */
export const idParam = z.coerce.number().int().positive();

/** `/:id` path params (addresses and every admin `[id]` route). */
export const idParams = z.object({ id: idParam });
export type IdParams = z.infer<typeof idParams>;
