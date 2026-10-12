import { z } from "zod";
import { emailField, fullNameField, mobileField, passwordField } from "../auth/auth.schemas";

export const updateProfileSchema = z
  .object({ fullName: fullNameField, email: emailField, mobile: mobileField })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Provide at least one field to update" });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Current password is required").max(200), newPassword: passwordField })
  .refine((v) => v.currentPassword !== v.newPassword, { path: ["newPassword"], message: "New password must be different" });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
