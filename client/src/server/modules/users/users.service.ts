import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { hashPassword, invalidateResetTokens, userSelect, verifyPassword } from "../auth/auth.service";
import type { ChangePasswordInput, UpdateProfileInput } from "./users.schemas";

export { getUser as getProfile } from "../auth/auth.service";

/** Duplicate email/mobile -> Prisma P2002 -> 409 CONFLICT (details[0].path = "email" | "mobile"). */
export function updateProfile(userId: number, data: UpdateProfileInput) {
  return prisma.user.update({ where: { id: userId }, data, select: userSelect });
}

/** Revokes every existing session (passwordChangedAt); the route re-issues the caller's own. */
export async function changePassword(userId: number, { currentPassword, newPassword }: ChangePasswordInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    // 400, not 401: the session is fine, so the client must not treat this as "logged out".
    throw new HttpError(400, "Current password is incorrect", "INVALID_PASSWORD", [
      { path: "body.currentPassword", message: "Current password is incorrect" },
    ]);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });
  await invalidateResetTokens(userId);
}
