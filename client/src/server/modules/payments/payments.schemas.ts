import { z } from "zod";
import { pincodeParams } from "./pincode";

export { pincodeParams };
export type PincodeParams = z.infer<typeof pincodeParams>;

export const verifyBody = z.object({
  orderNumber: z.string().trim().min(1).max(32),
  provider: z.string().trim().min(1).max(32).optional(),
  /** Gateway callback fields, e.g. { razorpay_order_id, razorpay_payment_id, razorpay_signature }. */
  payload: z.record(z.string(), z.unknown()).default({}),
});
export type VerifyBody = z.infer<typeof verifyBody>;
