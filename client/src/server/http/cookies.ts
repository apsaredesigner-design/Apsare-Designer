// Cookie parsing/serialising for Route Handlers without next/headers, so a handler
// can be called directly with a plain `Request` (tests) and every cookie is set on
// the Response it returns. Output matches Express `res.cookie` / `res.clearCookie`.

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  domain?: string;
  /** Milliseconds, like Express. Sets both Max-Age and Expires. */
  maxAge?: number;
  expires?: Date;
}

/** Parses a `Cookie` request header (values URI-decoded, like cookie-parser). First occurrence wins. */
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || name in out) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

const SAME_SITE = { lax: "Lax", strict: "Strict", none: "None" } as const;

/** One `Set-Cookie` header value. */
export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  let str = `${name}=${encodeURIComponent(value)}`;
  const expires = opts.maxAge !== undefined ? (opts.expires ?? new Date(Date.now() + opts.maxAge)) : opts.expires;
  if (opts.maxAge !== undefined) str += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
  if (opts.domain) str += `; Domain=${opts.domain}`;
  str += `; Path=${opts.path ?? "/"}`;
  if (expires) str += `; Expires=${expires.toUTCString()}`;
  if (opts.httpOnly) str += "; HttpOnly";
  if (opts.secure) str += "; Secure";
  if (opts.sameSite) str += `; SameSite=${SAME_SITE[opts.sameSite]}`;
  return str;
}

/** Express 5 `res.clearCookie`: same attributes, empty value, expired (maxAge is ignored). */
export function serializeClearedCookie(name: string, opts: CookieOptions = {}): string {
  return serializeCookie(name, "", { ...opts, maxAge: undefined, expires: new Date(0) });
}
