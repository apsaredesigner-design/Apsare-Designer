import { z } from "zod";
import { OrderStatus, PaymentMethod, PaymentStatus } from "../../../generated/prisma/client";
import { paginationQuery } from "../../utils/pagination";
import { optionalText, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/orders (extracted from server admin.orders.ts).

/** `from`/`to` accept a date (YYYY-MM-DD, whole day, UTC) or a full ISO timestamp. */
const dateParam = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const listQuery = paginationQuery
  .extend({
    q: searchTerm, // order number, customer name/email/mobile, or ship name
    userId: z.coerce.number().int().positive().optional(), // one customer's orders
    status: z.enum(OrderStatus).optional(),
    paymentMethod: z.enum(PaymentMethod).optional(),
    paymentStatus: z.enum(PaymentStatus).optional(),
    from: dateParam.optional(),
    to: dateParam.optional(),
    sort: z.enum(["createdAt_desc", "createdAt_asc", "finalAmount_desc", "finalAmount_asc"]).default("createdAt_desc"),
  })
  .refine((q) => !q.from || !q.to || Date.parse(q.from) <= Date.parse(q.to), { path: ["to"], message: "`to` must be after `from`" });

/** GET /orders/export.csv: same filters and sort as the list, without paging. */
export const exportQuery = listQuery.safeExtend({ page: z.any().optional(), limit: z.any().optional() });

export const orderParams = z.object({ orderNumber: z.string().trim().min(1).max(40) });
export const statusSchema = z.object({ status: z.enum(OrderStatus), note: optionalText(500) });

export type ListQuery = z.infer<typeof listQuery>;
export type ExportQuery = z.infer<typeof exportQuery>;
export type OrderParams = z.infer<typeof orderParams>;
export type StatusInput = z.infer<typeof statusSchema>;
