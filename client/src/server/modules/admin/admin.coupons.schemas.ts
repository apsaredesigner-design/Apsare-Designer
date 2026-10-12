import { z } from "zod";
import { CouponType } from "../../../generated/prisma/client";
import { paginationQuery } from "../../utils/pagination";
import { money, optionalText, queryBool, searchTerm } from "./admin.shared";

// Zod schemas for /api/admin/coupons (extracted from server admin.coupons.ts).

export const listQuery = paginationQuery.extend({
  q: searchTerm, // code or description contains
  type: z.enum(CouponType).optional(),
  isActive: queryBool.optional(),
  // live = active and within its date window; scheduled = starts in the future; expired = at/after expiresAt
  // (the same boundaries validateCoupon uses: live until the instant expiresAt is reached)
  state: z.enum(["live", "scheduled", "expired"]).optional(),
  sort: z.enum(["createdAt_desc", "createdAt_asc", "code_asc", "expiresAt_asc", "usedCount_desc"]).default("createdAt_desc"),
});

/** POST body (Express `base`). Cross-field rules run in the service (couponIssues). */
export const createSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "3-30 letters, digits, _ or -"),
  description: optionalText(300),
  type: z.enum(CouponType),
  value: money.positive(),
  maxDiscount: money.positive().nullish(),
  minOrderAmount: money.optional(),
  usageLimit: z.number().int().min(1).max(10_000_000).nullish(),
  perUserLimit: z.number().int().min(1).max(1000).nullish(),
  firstOrderOnly: z.boolean().optional(),
  startsAt: z.coerce.date().nullish(),
  expiresAt: z.coerce.date().nullish(),
  isActive: z.boolean().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuery>;
export type CreateInput = z.infer<typeof createSchema>;
export type CouponInput = z.infer<typeof updateSchema>;
