import { z } from "zod";

export const applyBody = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(40),
  // Accepted for client convenience but ignored: the server always uses the real cart subtotal.
  subtotal: z.coerce.number().optional(),
});
export type ApplyBody = z.infer<typeof applyBody>;
