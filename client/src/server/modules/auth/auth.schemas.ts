import { z } from "zod";

/** Shared field rules, reused by the users module. */
export const emailField = z.string().trim().toLowerCase().pipe(z.email("Invalid email address").max(191));
/** Indian mobile: 10 digits starting 6-9. */
export const mobileField = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
export const fullNameField = z.string().trim().min(2, "Name is too short").max(100);
export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters") // bcrypt ignores bytes past 72
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const signupSchema = z.object({
  fullName: fullNameField,
  email: emailField,
  mobile: mobileField,
  password: passwordField,
  remember: z.boolean().default(false),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  /** Email or 10-digit mobile. */
  identifier: z.string().trim().min(1, "Email or mobile is required").max(191),
  // No complexity rules here: never hint at the password policy on login.
  password: z.string().min(1, "Password is required").max(200),
  remember: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/, "Invalid reset token"),
  password: passwordField,
});
