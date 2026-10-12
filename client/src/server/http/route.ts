// `route()`: the one wrapper every app/api/**/route.ts handler goes through. It
// replays the Express pipeline of server/src/app.ts per request, in the same order:
//
//   1. CSRF (csrf.ts): same-origin + JSON-only for POST/PUT/PATCH/DELETE
//   2. JSON body (express.json, 1 MB, strict): 400 bad JSON, 413 too large, 415 charset /
//      Content-Encoding (gzip, deflate and br are inflated; the limit is on the inflated size)
//   3. apiLimiter (every /api request)
//   4. auth: optional | user | admin (JWT from `token` cookie or Bearer, DB re-check)
//      cache: "no-store" is set here (Express: router.use(requireAuth, noStore, …))
//   5. the route's own limiter(s) (after auth, so per-user keys see the user)
//      (cache: "no-store" with `cacheAfterLimiters` is set here instead)
//   6. Zod: body, query, params → 400 VALIDATION_ERROR with `body.x` / `query.x` / `params.x`
//      cache: "public" is set here (Express: validate(…), publicCache)
//   7. the handler: return data (JSON, Prisma Decimals → numbers), `created(data)` (201),
//      `noContent()` (204), undefined (empty body), or a Response (streamed CSV, etc.)
//
// JSON bodies (data and errors) carry Express's weak ETag, and a conditional GET/HEAD
// that is still fresh gets 304 with no body (etag.ts).
// Any throw becomes `{ error: { message, code, details? } }` (errors.ts). Headers set
// before the throw (rate limits, cache, cookies) stay on the error response, as in Express.
// Cookies are read from the Request and set on the returned Response (no next/headers),
// so handlers can be called directly in tests.
import { parse as parseQueryString } from "node:querystring";
import { Readable, pipeline } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import zlib from "node:zlib";
import type { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { env } from "../config/env";
import { HttpError, type ErrorDetail } from "../utils/http-error";
import { authenticate, type AuthMode } from "./auth";
import { clientIp } from "./client-ip";
import { parseCookies, serializeClearedCookie, serializeCookie, type CookieOptions } from "./cookies";
import { errorResponse, zodDetails } from "./errors";
import { isFresh, notModified, weakEtag } from "./etag";
import { apiLimiter, type LimitHit, type Limiter } from "./rate-limit";
import type { AuthUser, CookieSink } from "./session";

export type { AuthMode } from "./auth";

/** Route params as Next passes them (`[id]` → string, `[...slug]` → string[]). */
export type RawParams = Record<string, string | string[] | undefined>;
/** Query string as Express 5 parsed it (node:querystring: repeated keys → array). */
export type RawQuery = Record<string, string | string[] | undefined>;

/** The exported METHOD of a route.ts: `(req, { params: Promise<…> }) => Promise<Response>`. */
export type RouteHandler = (req: Request, ctx: { params: Promise<RawParams> }) => Promise<Response>;

type Schema = z.ZodType | undefined;
type UserOf<A> = A extends "user" | "admin" ? AuthUser : AuthUser | undefined;
type Parsed<S, Fallback> = S extends z.ZodType ? z.output<S> : Fallback;

export interface RouteOptions<A extends AuthMode | undefined, P extends Schema, Q extends Schema, B extends Schema> {
  /** Omitted = public (no token read at all). */
  auth?: A;
  /** Route-specific limiter(s), run after auth, in order. apiLimiter is always applied. */
  limiter?: Limiter | Limiter[];
  params?: P;
  query?: Q;
  body?: B;
  /**
   * Leave a multipart/form-data body unread for the handler (`ctx.req`, uploads). A JSON
   * body is still parsed first (express.json ran before multer: bad JSON 400, too large 413).
   */
  rawBody?: boolean;
  /**
   * "public": `Vary: Cookie, Authorization` + `public, max-age=60, stale-while-revalidate=300`
   * (or `private, no-store` when signed in); set after validation (Express publicCache).
   * "no-store": `private, no-store`; set right after auth (Express noStore).
   */
  cache?: "public" | "no-store";
  /**
   * Set `cache: "no-store"` after the route limiters instead of right after auth, for
   * Express routes that listed the limiter before `noStore` (`POST /coupons/apply`:
   * `requireAuth, couponLimiter, noStore`), so their 429 has no Cache-Control.
   */
  cacheAfterLimiters?: boolean;
  /**
   * Called (not awaited, must not throw) with the final response once the request
   * got past auth and the limiters, e.g. the admin audit log (429s are not recorded).
   */
  after?: (ctx: AfterContext, res: Response) => void;
}

export interface AfterContext {
  req: Request;
  url: URL;
  method: string;
  ip: string;
  user: AuthUser | undefined;
}

export interface HandlerContext<A extends AuthMode | undefined, P extends Schema, Q extends Schema, B extends Schema> extends CookieSink {
  req: Request;
  url: URL;
  method: string;
  /** See client-ip.ts: the X-Forwarded-For hop with TRUST_PROXY=1, else "unknown". */
  ip: string;
  user: UserOf<A>;
  params: Parsed<P, RawParams>;
  query: Parsed<Q, RawQuery>;
  /** Parsed body; the raw JSON (or undefined) without a `body` schema. */
  body: Parsed<B, unknown>;
  /** Extra response headers (merged into whatever the handler returns). */
  headers: Headers;
  /** Status for returned data (default 200). */
  setStatus(status: number): void;
}

export type Handler<A extends AuthMode | undefined, P extends Schema, Q extends Schema, B extends Schema> = (
  ctx: HandlerContext<A, P, Q, B>,
) => unknown;

// ─── CSRF (server/src/middleware/csrf.ts) ───────────────────────

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Origins this deploy trusts as "same site": CLIENT_URL (explicit override, e.g. a custom
 * domain) plus Vercel's own platform-injected deployment URLs. VERCEL_URL / VERCEL_PROJECT_
 * PRODUCTION_URL are set by Vercel's build/runtime system for every deployment (prod and
 * every preview) -- never by request data -- so trusting them doesn't reintroduce a Host-
 * header-style trust issue the way deriving this from the request itself would, while still
 * fixing CLIENT_URL drifting out of sync with whatever domain a given deployment landed on.
 */
const allowedOrigins = new Set(
  [env.clientUrl, process.env["VERCEL_URL"] && `https://${process.env["VERCEL_URL"]}`, process.env["VERCEL_PROJECT_PRODUCTION_URL"] && `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`]
    .filter((v): v is string => Boolean(v))
    .map(originOf)
    .filter((v): v is string => v !== null),
);

const mediaType = (req: Request) => req.headers.get("content-type")?.split(";")[0].trim().toLowerCase();

/**
 * State-changing requests whose Origin (or, failing that, Referer) is not a trusted origin
 * get 403 CSRF (requests with neither header are allowed: browsers always send Origin
 * cross-site). They must be application/json, or multipart/form-data under /api/uploads/.
 * Body-less requests without a Content-Type are fine.
 */
export function checkSameOrigin(req: Request, pathname: string): void {
  if (!STATE_CHANGING.has(req.method)) return;

  const source = req.headers.get("origin") ?? req.headers.get("referer");
  // An Origin/Referer that's present but unparseable (e.g. the literal `Origin: null` browsers
  // send for a sandboxed/opaque origin) must still be blocked -- only a genuinely absent
  // header (source === null) skips the check.
  if (source !== null && !allowedOrigins.has(originOf(source) ?? "")) {
    throw new HttpError(403, "Cross-site request blocked", "CSRF");
  }

  const type = mediaType(req);
  const hasBody = Number(req.headers.get("content-length") ?? 0) > 0 || req.headers.get("transfer-encoding") !== null;
  if (type === undefined ? hasBody : type !== "application/json" && !(type === "multipart/form-data" && pathname.startsWith("/api/uploads/"))) {
    throw new HttpError(415, "Content-Type must be application/json", "UNSUPPORTED_MEDIA_TYPE");
  }
}

// ─── JSON body (express.json({ limit: "1mb" }), strict) ─────────

export const JSON_LIMIT_BYTES = 1024 * 1024;

/** body-parser's strict-mode error: re-parse with the offending token masked so the message names it. */
function strictSyntaxError(text: string, char: string): HttpError {
  const index = text.indexOf(char);
  const partial = index === -1 ? "" : text.slice(0, index) + "#".repeat(text.length - index);
  try {
    JSON.parse(partial);
  } catch (e) {
    const message = (e as Error).message.replace(/#+/g, (p) => text.slice(index, index + p.length));
    return new HttpError(400, message);
  }
  return new HttpError(400, "Invalid JSON");
}

/** The `charset` parameter of Content-Type, lower-cased (content-type's parser: token or quoted string). */
function charsetOf(req: Request): string | undefined {
  const m = /;\s*charset\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;\s]*))/i.exec(req.headers.get("content-type") ?? "");
  return m ? (m[1]?.replace(/\\(.)/g, "$1") ?? m[2]).toLowerCase() : undefined;
}

const INFLATERS: Record<string, () => NodeJS.ReadWriteStream> = {
  deflate: () => zlib.createInflate(),
  gzip: () => zlib.createGunzip(),
  br: () => zlib.createBrotliDecompress(),
};

const tooLarge = () => new HttpError(413, "request entity too large");

/** Reads the (inflated) body, stopping with 413 as soon as it passes the limit (raw-body). */
async function readLimited(req: Request, inflate: (() => NodeJS.ReadWriteStream) | undefined): Promise<Buffer> {
  const source = Readable.fromWeb(req.body as NodeReadableStream<Uint8Array>);
  const stream = inflate ? pipeline(source, inflate(), () => {}) : source;
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > JSON_LIMIT_BYTES) throw tooLarge();
      chunks.push(chunk);
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, (e as Error).message); // e.g. zlib's "incorrect header check"
  }
  return Buffer.concat(chunks);
}

/**
 * body-parser's json(): returns the parsed JSON body, `{}` for an empty JSON body, undefined
 * when the request isn't JSON. In body-parser's order: a charset not starting with `utf-`
 * → 415 `unsupported charset "X"`; a Content-Encoding other than identity/deflate/gzip/br
 * → 415 `unsupported content encoding "x"`; a utf- charset the decoder doesn't know → 415
 * charset; Content-Length over 1 MB (identity only) → 413; then the 1 MB limit on the
 * inflated bytes (413), a broken stream → 400, strict JSON → 400.
 */
export async function readJsonBody(req: Request): Promise<unknown> {
  if (mediaType(req) !== "application/json") return undefined;
  if (!req.body) return {};

  const charset = charsetOf(req) ?? "utf-8";
  if (!charset.startsWith("utf-")) throw new HttpError(415, `unsupported charset "${charset.toUpperCase()}"`);
  const encoding = (req.headers.get("content-encoding") ?? "identity").toLowerCase();
  const inflate = INFLATERS[encoding];
  if (encoding !== "identity" && !inflate) throw new HttpError(415, `unsupported content encoding "${encoding}"`);
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset); // strips a BOM, like iconv-lite
  } catch {
    throw new HttpError(415, `unsupported charset "${charset.toUpperCase()}"`);
  }
  if (!inflate && Number(req.headers.get("content-length") ?? 0) > JSON_LIMIT_BYTES) throw tooLarge();

  const buf = await readLimited(req, inflate);
  if (buf.length === 0) return {};

  const text = decoder.decode(buf);
  const first = /^[\x20\x09\x0a\x0d]*([^\x20\x09\x0a\x0d])/.exec(text)?.[1];
  if (first !== undefined && first !== "{" && first !== "[") throw strictSyntaxError(text, first);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
}

// ─── Responses ──────────────────────────────────────────────────

/** Prisma Decimals (money) serialise as strings by default; send them as numbers. */
export function decimalReplacer(this: Record<string, unknown>, key: string, value: unknown) {
  return Prisma.Decimal.isDecimal(this[key]) ? (this[key] as Prisma.Decimal).toNumber() : value;
}

/** Same bytes and headers as Express `res.json(data)`, including its weak ETag (every status). */
export function jsonResponse(data: unknown, status = 200, headers: Headers = new Headers()): Response {
  headers.set("Content-Type", "application/json; charset=utf-8");
  const body = status === 204 || status === 304 ? null : JSON.stringify(data, decimalReplacer);
  if (body !== null && !headers.has("ETag")) headers.set("ETag", weakEtag(body));
  return new Response(body, { status, headers });
}

/** Adds the wrapper's headers (Set-Cookie, RateLimit, Cache-Control…) to a handler-built Response. */
function mergeHeaders(res: Response, extra: Headers): Response {
  const headers = new Headers(res.headers);
  for (const cookie of extra.getSetCookie()) headers.append("Set-Cookie", cookie);
  extra.forEach((value, key) => {
    if (key !== "set-cookie" && !headers.has(key)) headers.set(key, value);
  });
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// ─── The wrapper ────────────────────────────────────────────────

/** Zod for body/query/params → 400 VALIDATION_ERROR with `query.x`-style paths. Also used by `server/queries.ts`. */
export function runSchemas(schemas: { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType }, input: { body: unknown; query: unknown; params: unknown }) {
  const details: ErrorDetail[] = [];
  const out: { body?: unknown; query?: unknown; params?: unknown } = {};
  for (const key of ["body", "query", "params"] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const result = schema.safeParse(input[key] ?? {});
    if (result.success) out[key] = result.data;
    else details.push(...zodDetails(result.error).map((d) => ({ ...d, path: d.path ? `${key}.${d.path}` : key })));
  }
  if (details.length) throw new HttpError(400, "Validation failed", "VALIDATION_ERROR", details);
  return out;
}

/**
 * Builds a Route Handler. Example (app/api/products/[slug]/reviews/route.ts):
 *
 *   export const { GET, POST, PUT, PATCH, DELETE } = methods({
 *     GET: route({ params: slugParams, query: reviewsQuery, cache: "public" }, ({ params, query }) =>
 *       listReviews(params.slug, query)),
 *     POST: route({ auth: "user", limiter: reviewLimiter, params: slugParams, body: createReviewBody },
 *       ({ user, params, body }) => createReview(params.slug, user.id, body).then(created)),
 *   });
 */
export function route<
  A extends AuthMode | undefined = undefined,
  P extends Schema = undefined,
  Q extends Schema = undefined,
  B extends Schema = undefined,
>(options: RouteOptions<A, P, Q, B>, handler: Handler<A, P, Q, B>): RouteHandler {
  const limiters = options.limiter === undefined ? [] : [options.limiter].flat();

  return async (req, nextCtx) => {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const headers = new Headers();
    const ip = clientIp(req);
    const hits: LimitHit[] = [];
    let status = 200;
    let user: AuthUser | undefined;
    let guarded = false;

    let res: Response;
    let handlerBuiltResponse = false;
    try {
      checkSameOrigin(req, url.pathname);
      const rawBody = options.rawBody && mediaType(req) === "multipart/form-data" ? undefined : await readJsonBody(req);
      const rawQuery = { ...parseQueryString(url.search.slice(1)) } as RawQuery;
      const limitReq = { method, query: rawQuery, ip, user: undefined as AuthUser | undefined };

      const apiHit = apiLimiter.hit(limitReq, headers);
      if (apiHit) hits.push(apiHit);

      if (options.auth) {
        user = await authenticate(options.auth, parseCookies(req.headers.get("cookie")), req.headers.get("authorization"));
      }
      const noStore = () => headers.set("Cache-Control", "private, no-store");
      if (options.cache === "no-store" && !options.cacheAfterLimiters) noStore();

      limitReq.user = user;
      for (const limiter of limiters) {
        const hit = limiter.hit(limitReq, headers);
        if (hit) hits.push(hit);
      }
      if (options.cache === "no-store" && options.cacheAfterLimiters) noStore();
      guarded = true;

      const rawParams = ((await nextCtx?.params) ?? {}) as RawParams;
      const parsed = runSchemas(options, { body: rawBody, query: rawQuery, params: rawParams });

      if (options.cache === "public") {
        headers.set("Vary", "Cookie, Authorization");
        headers.set("Cache-Control", user ? "private, no-store" : "public, max-age=60, stale-while-revalidate=300");
      }

      const ctx = {
        req,
        url,
        method,
        ip,
        user,
        params: options.params ? parsed.params : rawParams,
        query: options.query ? parsed.query : rawQuery,
        body: options.body ? parsed.body : rawBody,
        headers,
        setStatus: (s: number) => void (status = s),
        setCookie: (name: string, value: string, opts?: CookieOptions) => headers.append("Set-Cookie", serializeCookie(name, value, opts)),
        clearCookie: (name: string, opts?: CookieOptions) => headers.append("Set-Cookie", serializeClearedCookie(name, opts)),
      } as HandlerContext<A, P, Q, B>;

      const result = await handler(ctx);
      if (result instanceof Response) {
        handlerBuiltResponse = true;
        res = mergeHeaders(result, headers);
      }
      else if (result === undefined) res = new Response(null, { status, headers });
      else res = jsonResponse(result, status, headers);
    } catch (err) {
      res = errorResponse(err, headers);
    }
    // Express only ran its freshness check inside res.send/res.json, so a handler-built
    // Response (e.g. the streamed CSV export) always goes out as-is.
    if (!handlerBuiltResponse && isFresh(method, res.status, req.headers, res.headers)) res = notModified(res);

    for (const hit of hits) hit.settle(res.status);
    if (guarded && options.after) {
      try {
        options.after({ req, url, method, ip, user }, res);
      } catch (err) {
        console.error("[route] after hook failed", err);
      }
    }
    return res;
  };
}

// ─── Unknown routes / methods ───────────────────────────────────

/** The Express `notFound` handler body: `404 Route not found: GET /api/x`. */
export const throwNotFound = ({ method, url }: { method: string; url: URL }): never => {
  throw new HttpError(404, `Route not found: ${method} ${url.pathname}`);
};

/** Express `notFound`: `404 Route not found: GET /api/x` (CSRF and apiLimiter still apply). */
export const notFound: RouteHandler = route({}, throwNotFound);

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
export type MethodHandlers = Record<HttpMethod, RouteHandler>;

/**
 * Fills every method a route.ts doesn't implement with `fallback` (default `notFound`),
 * so e.g. PUT on a GET-only path answers Express's 404 JSON instead of Next's empty 405.
 * HEAD and OPTIONS are left to Next (HEAD runs GET without a body; OPTIONS lists Allow).
 *
 *   export const { GET, POST, PUT, PATCH, DELETE } = methods({ GET: route(…), POST: route(…) });
 */
export function methods(defs: Partial<MethodHandlers>, fallback: RouteHandler = notFound): MethodHandlers {
  return Object.fromEntries(HTTP_METHODS.map((m) => [m, defs[m] ?? fallback])) as MethodHandlers;
}

/** An Express `router.use(...)` guard: the route() options every request into that router went through. */
export type Guard = Pick<RouteOptions<AuthMode, undefined, undefined, undefined>, "auth" | "limiter" | "cache" | "cacheAfterLimiters" | "after">;

/**
 * `methods()` for a file whose Express router had router-level middleware, e.g.
 * `router.use(requireAuth, noStore, cartLimiter)`: a method the router didn't implement
 * still ran that middleware before `notFound` (guest 401, customer 403 on admin, then the
 * 404 with `no-store` / the limiter counted). Also the whole file of a `[...slug]`
 * catch-all under a guarded prefix: `guardedMethods(guard, {})`.
 */
export function guardedMethods(guard: Guard, defs: Partial<MethodHandlers>): MethodHandlers {
  return methods(defs, route(guard, throwNotFound));
}

/**
 * A static folder next to a `[param]` sibling (`banners/reorder` vs `banners/[id]`).
 * Express registered the static path first and let every other method fall through
 * to `/:param` (→ usually 400 `params.x`); Next's static folder wins for all methods.
 * So each method `defs` lacks is the sibling's handler called with `params`.
 *
 *   export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byId, { id: "reorder" }, { PUT: adminRoute(…) });
 */
export function staticTwin(sibling: MethodHandlers, params: RawParams, defs: Partial<MethodHandlers>): MethodHandlers {
  const asSibling = (m: HttpMethod): RouteHandler => (req) => sibling[m](req, { params: Promise.resolve(params) });
  return Object.fromEntries(HTTP_METHODS.map((m) => [m, defs[m] ?? asSibling(m)])) as MethodHandlers;
}

/** Handler return values for Express `res.status(201).json(data)` / `res.status(204).end()`. */
export const created = (data: unknown): Response => jsonResponse(data, 201);
export const noContent = (): Response => new Response(null, { status: 204 });
