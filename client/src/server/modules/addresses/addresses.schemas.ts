import { z } from "zod";
import { pincodeSchema } from "../payments/pincode";

const text = (max: number) => z.string().trim().min(1, "Required").max(max);
/** Optional text: "" and null both mean "clear it"; omitted stays undefined (untouched on update). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === "" ? null : v));

const addressFields = z.object({
  fullName: text(100),
  mobile: z.string().trim().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  line1: text(191),
  line2: optionalText(191),
  landmark: optionalText(191),
  city: text(100),
  state: text(100),
  pincode: pincodeSchema,
  isDefault: z.boolean().optional(),
});

export const createAddressSchema = addressFields;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = addressFields
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Provide at least one field to update" });
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export { idParams as addressIdParams, type IdParams as AddressIdParams } from "../../utils/params";
