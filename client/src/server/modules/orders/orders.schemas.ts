import { z } from "zod";
import { OrderStatus, PaymentMethod } from "../../../generated/prisma/client";
import { paginationQuery } from "../../utils/pagination";

export const placeBody = z.object({
  addressId: z.number().int().positive(),
  paymentMethod: z.enum(PaymentMethod),
  couponCode: z.string().trim().max(32).optional().transform((v) => v || undefined),
});
export type PlaceBody = z.infer<typeof placeBody>;

export const listQuery = paginationQuery.extend({ status: z.enum(OrderStatus).optional() });
export type ListQuery = z.infer<typeof listQuery>;

export const orderParams = z.object({ orderNumber: z.string().trim().min(1).max(32).transform((s) => s.toUpperCase()) });
export type OrderParams = z.infer<typeof orderParams>;

export const cancelBody = z.object({ reason: z.string().trim().max(500).optional().transform((v) => v || undefined) });
export type CancelBody = z.infer<typeof cancelBody>;
