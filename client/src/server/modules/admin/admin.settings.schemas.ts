import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { pincodeParams, pincodeSchema as pincode } from "../payments/pincode";
import { money, queryBool } from "./admin.shared";

// Zod schemas for /api/admin/settings and /api/admin/settings/pincodes (extracted from server admin.settings.ts).

export const settingsSchema = z.object({
  deliveryCharge: money.max(10_000),
  freeShippingThreshold: money,
  codFee: money.max(10_000),
});

export const pincodeInput = z.object({
  pincode,
  deliveryDays: z.number().int().min(1).max(30).optional(),
  codAvailable: z.boolean().optional(),
});
export const pincodeUpdate = pincodeInput
  .omit({ pincode: true })
  .refine((v) => v.deliveryDays !== undefined || v.codAvailable !== undefined, { message: "Send deliveryDays and/or codAvailable" });
export const bulkSchema = z.object({ pincodes: z.array(pincodeInput).min(1).max(1000) });
export { pincodeParams };
/** GET /settings/pincodes query (Express `listQuery`). */
export const listQuery = paginationQuery.extend({
  q: z.string().trim().regex(/^\d{1,6}$/, "Digits only").optional(), // pincode prefix
  codAvailable: queryBool.optional(),
  sort: z.enum(["pincode_asc", "pincode_desc", "deliveryDays_asc"]).default("pincode_asc"),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type PincodeInput = z.infer<typeof pincodeInput>;
export type PincodeUpdate = z.infer<typeof pincodeUpdate>;
export type BulkInput = z.infer<typeof bulkSchema>;
export type PincodeParams = z.infer<typeof pincodeParams>;
export type ListQuery = z.infer<typeof listQuery>;
