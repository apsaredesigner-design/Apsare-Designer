import { z } from "zod";
import { emailField, fullNameField } from "../auth/auth.schemas";

export const contactSchema = z.object({
  name: fullNameField,
  email: emailField,
  /** Optional; digits with an optional leading +, spaces or dashes. "" counts as not given. */
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^(\+?[\d\s-]{7,20})?$/, "Enter a valid phone number")
    .optional()
    .transform((v) => v || undefined),
  subject: z.string().trim().min(2, "Subject is too short").max(150),
  message: z.string().trim().min(10, "Message is too short").max(5000),
});
export type ContactInput = z.infer<typeof contactSchema>;
