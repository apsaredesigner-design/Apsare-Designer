import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { durationMs, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "../utils/auth-cookie";
import type { CookieOptions } from "./cookies";

export type Role = "CUSTOMER" | "ADMIN";
export interface AuthUser {
  id: number;
  role: Role;
}

/** Anything that can set cookies on the outgoing response: the `ctx` of a `route()` handler. */
export interface CookieSink {
  setCookie(name: string, value: string, opts?: CookieOptions): void;
  clearCookie(name: string, opts?: CookieOptions): void;
}

/** Signs a JWT `{ id, role }` (HS256) and sets it as the httpOnly session cookie. "Remember me" = longer expiry. */
export function issueSession(res: CookieSink, user: AuthUser, remember = false): void {
  const maxAge = durationMs(remember ? env.jwt.rememberExpiresIn : env.jwt.expiresIn);
  const token = jwt.sign({ id: user.id, role: user.role }, env.jwt.secret, { algorithm: "HS256", expiresIn: Math.floor(maxAge / 1000) });
  res.setCookie(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge });
}

export function clearSession(res: CookieSink): void {
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
}
