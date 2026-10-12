import { z } from "zod";

/** Indian PIN code: 6 digits, first digit 1-9. The one pincode rule (addresses, checkout, admin settings). */
export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode");

/** `/:pincode` path params (payments pincode check, admin settings pincodes). */
export const pincodeParams = z.object({ pincode: pincodeSchema });
