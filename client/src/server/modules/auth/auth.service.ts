import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { Prisma } from "../../../generated/prisma/client";
import { escapeHtml, sendMail } from "../../lib/mailer";
import { forgotPasswordTemplate } from "../../lib/email-templates";
import { prisma } from "../../lib/prisma";
import type { Role } from "../../http/session";
import { HttpError } from "../../utils/http-error";
import type { LoginInput, SignupInput } from "./auth.schemas";

const BCRYPT_COST = 12;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
/** Compared against when the user doesn't exist, so response time doesn't reveal which accounts exist. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

/** Public user shape. Never includes passwordHash or tokens. Reused by the users module. */
export const userSelect = {
  id: true,
  fullName: true,
  email: true,
  mobile: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function signup(input: SignupInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: { fullName: input.fullName, email: input.email, mobile: input.mobile, passwordHash },
      select: userSelect,
    });
  } catch (err) {
    // Duplicate email/mobile: one generic 409 with no field detail, so signup can't be used to probe accounts.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new HttpError(409, "An account with these details already exists", "CONFLICT");
    }
    throw err;
  }
}

/** Email or mobile + password. Generic 401 on any mismatch; `requiredRole` restricts e.g. admin login. */
export async function login({ identifier, password }: LoginInput, requiredRole?: Role) {
  const where = identifier.includes("@") ? { email: identifier.toLowerCase() } : { mobile: identifier };
  const user = await prisma.user.findUnique({ where, select: { ...userSelect, passwordHash: true } });

  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || (requiredRole && user.role !== requiredRole)) {
    throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }
  // Only revealed to someone who knows the password.
  if (!user.isActive) throw new HttpError(403, "This account has been disabled", "ACCOUNT_DISABLED");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omitted on purpose (rest destructuring)
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

export async function getUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

/** Creates a single-use reset token (only its sha256 is stored). Silent when the email is unknown. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true, fullName: true } });
  if (!user) throw new HttpError(404, "No account found with this email address", "USER_NOT_FOUND");
  if (!user.isActive) throw new HttpError(403, "This account has been disabled", "ACCOUNT_DISABLED");

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const link = `${env.clientUrl}/reset-password?token=${token}`;
  const { text, html } = forgotPasswordTemplate(user.fullName, link);
  
  sendMail({
    to: email,
    subject: "Reset your Label Apsáre password",
    text,
    html,
  });
}

/** Consumes the token atomically, sets the new password and burns the user's other outstanding tokens. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const tokenHash = sha256(token);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Conditional update = atomic claim: two concurrent requests can't both consume it.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw new HttpError(400, "This reset link is invalid or has expired", "INVALID_RESET_TOKEN");

    const { userId } = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash }, select: { userId: true } });
    // passwordChangedAt revokes every session issued before now (see middleware/auth.ts).
    await tx.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: now } });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
  });
}

/** Burns any outstanding reset tokens (e.g. after a password change). */
export async function invalidateResetTokens(userId: number): Promise<void> {
  await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
}
