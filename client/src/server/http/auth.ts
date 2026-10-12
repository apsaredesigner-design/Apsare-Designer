// Port of server/src/middleware/auth.ts for Route Handlers.
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { SESSION_COOKIE } from "../utils/auth-cookie";
import { HttpError } from "../utils/http-error";
import type { AuthUser } from "./session";

/**
 * Reads the JWT from the httpOnly cookie (or a Bearer header), then does one
 * primary-key lookup so deactivated/deleted users, role changes and password
 * changes (tokens issued before `passwordChangedAt`) take effect immediately
 * instead of when the token expires.
 * Returns null for "no token"; throws 401 for a bad or stale one.
 */
export async function resolveUser(cookies: Record<string, string>, authorization: string | null): Promise<AuthUser | null> {
  const token = cookies[SESSION_COOKIE] ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);
  if (!token) return null;

  let payload: jwt.JwtPayload & Partial<AuthUser>;
  try {
    payload = jwt.verify(token, env.jwt.secret, { algorithms: ["HS256"] }) as jwt.JwtPayload & Partial<AuthUser>;
  } catch {
    throw new HttpError(401, "Invalid or expired session");
  }
  if (typeof payload.id !== "number" || typeof payload.iat !== "number") throw new HttpError(401, "Invalid or expired session");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, isActive: true, passwordChangedAt: true },
  });
  if (!user?.isActive) throw new HttpError(401, "Account not found or disabled");
  // `iat` has 1-second resolution, so compare whole seconds: the session re-issued by
  // change-password (same second) stays valid, anything older is revoked.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new HttpError(401, "Session expired, please log in again");
  }
  return { id: user.id, role: user.role };
}

export type AuthMode = "optional" | "user" | "admin";

/**
 * `user`: 401 without a valid session. `admin`: also 403 unless role ADMIN.
 * `optional`: a missing or bad token just means guest (undefined).
 */
export async function authenticate(mode: AuthMode, cookies: Record<string, string>, authorization: string | null): Promise<AuthUser | undefined> {
  if (mode === "optional") return (await resolveUser(cookies, authorization).catch(() => null)) ?? undefined;
  const user = await resolveUser(cookies, authorization);
  if (!user) throw new HttpError(401, "Not authenticated");
  if (mode === "admin" && user.role !== "ADMIN") throw new HttpError(403, "Admin access required");
  return user;
}
