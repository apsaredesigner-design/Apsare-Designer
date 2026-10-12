import { env } from "../config/env";
import type { CookieOptions } from "../http/cookies";

/** The httpOnly session cookie holding the JWT. */
export const SESSION_COOKIE = "token";

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** "7d" / "12h" / "30m" / "45s" -> milliseconds. */
export function durationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}" (use e.g. 7d, 12h)`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}

/** Flags shared by set and clear (must match, or the browser keeps the old cookie). */
export const SESSION_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/" };
