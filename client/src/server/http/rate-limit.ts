// In-process fixed-window rate limiters, a port of server/src/middleware/rate-limit.ts
// (express-rate-limit, MemoryStore, draft-8 headers). Counters live in this process's
// memory, one Map per limiter, so they are per server instance: a multi-instance
// deploy needs a shared store (Redis/Upstash). Every limit is in docs/API.md.
import { createHash } from "node:crypto";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import { ipKeyGenerator } from "./client-ip";
import type { AuthUser } from "./session";

/** What a limiter may look at (the raw query, before validation, like Express `req.query`). */
export interface LimitRequest {
  method: string;
  query: Record<string, string | string[] | undefined>;
  user?: AuthUser;
  ip: string;
}

export interface LimitOptions {
  skip?: (req: LimitRequest) => boolean;
  keyGenerator?: (req: LimitRequest) => string;
  /** Decrement the counter again when the response status is < 400 (loginLimiter). */
  skipSuccessfulRequests?: boolean;
}

/** Result of one counted request. `settle(status)` must be called with the final status. */
export interface LimitHit {
  settle(status: number): void;
}

export interface Limiter {
  readonly name: string;
  readonly windowMs: number;
  readonly limit: number;
  /**
   * Counts the request and appends the `RateLimit` / `RateLimit-Policy` headers to
   * `headers`. Throws 429 RATE_LIMITED (with `Retry-After`) when over the limit.
   * Returns null when the limiter is skipped or disabled.
   */
  hit(req: LimitRequest, headers: Headers): LimitHit | null;
  /** Forget every counter (tests). */
  reset(): void;
}

const MINUTE = 60_000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Per signed-in user when there is a session (auth runs before the limiter), else per IP (IPv6 by /56 subnet). */
const userOrIp = (req: LimitRequest) => (req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`);
const byIp = (req: LimitRequest) => ipKeyGenerator(req.ip);

/** `RATE_LIMIT_<NAME>=n` overrides a limit's default. */
function envLimit(name: string, fallback: number): number {
  const value = Number(process.env[`RATE_LIMIT_${name}`]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/** express-rate-limit's draft-8 partition key: first 12 hex chars of sha256(key), base64. */
const partitionKey = (key: string) => Buffer.from(createHash("sha256").update(key).digest("hex").slice(0, 12)).toString("base64");

export function createLimiter(name: string, windowMs: number, defaultLimit: number, opts: LimitOptions = {}): Limiter {
  const id = name.toLowerCase();
  const limit = envLimit(name, defaultLimit);
  const keyGenerator = opts.keyGenerator ?? byIp;
  const store = new Map<string, { hits: number; resetAt: number }>();

  const sweep = (now: number) => {
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  };

  return {
    name: id,
    windowMs,
    limit,
    reset: () => store.clear(),
    hit(req, headers) {
      if (env.rateLimitDisabled || opts.skip?.(req)) return null;
      const now = Date.now();
      if (store.size > 10_000) sweep(now);

      const key = keyGenerator(req);
      let entry = store.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { hits: 0, resetAt: now + windowMs };
        store.set(key, entry);
      }
      entry.hits++;
      const counted = entry;

      const resetSeconds = Math.max(0, Math.ceil((counted.resetAt - now) / 1000));
      headers.append("RateLimit", `"${id}"; r=${Math.max(limit - counted.hits, 0)}; t=${resetSeconds}`);
      headers.append("RateLimit-Policy", `"${id}"; q=${limit}; w=${Math.ceil(windowMs / 1000)}; pk=:${partitionKey(key)}:`);

      if (counted.hits > limit) {
        headers.set("Retry-After", String(resetSeconds));
        throw new HttpError(429, "Too many requests, please try again later");
      }

      return {
        settle(status) {
          // Only undo within the same window (as express-rate-limit does).
          if (opts.skipSuccessfulRequests && status < 400 && Date.now() < counted.resetAt && store.get(key) === counted) {
            counted.hits = Math.max(0, counted.hits - 1);
          }
        },
      };
    },
  };
}

/** Only POST/PUT/PATCH/DELETE count. */
const mutationsOnly: LimitOptions = { skip: (req) => SAFE_METHODS.has(req.method), keyGenerator: userOrIp };
/** Like Express: only a single, non-blank string counts (`?q=a&q=b` is an array → skipped). */
const nonBlank = (v: string | string[] | undefined) => typeof v === "string" && v.trim() !== "";

// ─── Per IP ─────────────────────────────────────────────────────

/** Applied by route() to every /api request. Generous, because SSR fetches share the Next.js server's IP. */
export const apiLimiter = createLimiter("API", 15 * MINUTE, 1000);

/** Login and admin login: 10 failed attempts per 15 minutes per IP. Successful logins don't count. */
export const loginLimiter = createLimiter("LOGIN", 15 * MINUTE, 10, { skipSuccessfulRequests: true });

/**
 * Endpoints that create accounts, send email, reveal whether an email/mobile is
 * taken or accept public writes (signup, forgot/reset password, PATCH /users/me,
 * change-password, contact form): 10 requests per 15 minutes per IP. Separate counter from login.
 */
export const sensitiveLimiter = createLimiter("SENSITIVE", 15 * MINUTE, 10);

// ─── Per user (per IP for guests) ───────────────────────────────

/** Cart and wishlist writes. */
export const cartLimiter = createLimiter("CART", MINUTE, 120, mutationsOnly);
/** POST /api/orders. */
export const orderLimiter = createLimiter("ORDERS", 10 * MINUTE, 10, { keyGenerator: userOrIp });
/** POST /api/orders/:orderNumber/cancel. */
export const cancelLimiter = createLimiter("CANCEL", 60 * MINUTE, 20, { keyGenerator: userOrIp });
/** POST /api/products/:slug/reviews. */
export const reviewLimiter = createLimiter("REVIEWS", 60 * MINUTE, 10, { keyGenerator: userOrIp });
/** POST /api/coupons/apply and GET /api/cart?coupon= (anti brute-force of codes). Requests without a code are skipped. */
export const couponLimiter = createLimiter("COUPON", 10 * MINUTE, 20, {
  keyGenerator: userOrIp,
  skip: (req) => req.method === "GET" && !nonBlank(req.query.coupon),
});
/** Every /api/uploads request. */
export const uploadLimiter = createLimiter("UPLOADS", 10 * MINUTE, 60, { keyGenerator: userOrIp });
/** Admin writes under /api/admin. */
export const adminLimiter = createLimiter("ADMIN", 5 * MINUTE, 300, mutationsOnly);
/** GET /api/products with a non-empty `q`. */
export const searchLimiter = createLimiter("SEARCH", MINUTE, 120, {
  keyGenerator: userOrIp,
  skip: (req) => !nonBlank(req.query.q),
});
