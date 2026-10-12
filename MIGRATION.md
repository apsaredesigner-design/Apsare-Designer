# Migration: Express API → Next.js Route Handlers

Single source of truth for this migration. Update it as each unit lands.

| | |
| --- | --- |
| Source | `server/`: Express 5 + TypeScript ESM + Prisma 7 (mariadb adapter) + MySQL 8. 93 route registrations, 239 integration tests |
| Target | `client/`: Next.js 16 App Router Route Handlers at `app/api/**/route.ts` (Node runtime), same URLs and JSON contract as `docs/API.md` |
| Source SHA | `acc53b7` (inventory taken here; `server/` is frozen during the migration) |
| Coexistence | Express keeps running on :4000 as the parity oracle until Phase 6. The Next API serves `/api/*` same-origin. Cutover in Phase 6: the frontend uses relative `/api`, and `server/` is deleted |
| Parity oracle | The 239 tests in `server/test/**` (they encode every endpoint, edge case and error shape) plus `docs/API.md` |

## Decisions (approved by the user 2026-09-26)

- Route Handlers at `/api` with the same paths, status codes and error shape `{ error: { message, code, details? } }`. No Server Actions rewrite.
- Services (`*.service.ts`, Prisma logic) move almost unchanged into `client/src/server/modules/**`. Only the HTTP glue is rewritten (routes, middleware, cookies, multer, rate limiting).
- The route wrapper reads cookies and headers from the `Request` and sets cookies on the returned `NextResponse`, rather than using `next/headers`, so handlers can be invoked directly in tests.
- Rate limiting becomes an in-process fixed-window limiter (single instance). Multi-instance deploys need Redis/Upstash later; this is documented, not built.
- Commits: none without the user's explicit approval (global rule). Units are ticked here as they land.

## Approved libraries (client workspace)

Add: `@prisma/client`, `@prisma/adapter-mariadb`, `bcryptjs`, `jsonwebtoken`, `zod`, `cloudinary`; dev: `prisma`, `@types/jsonwebtoken`, `vitest`, `tsx`.
Remove at cutover (Phase 6): `express`, `cors`, `helmet`, `cookie-parser`, `multer`, `express-rate-limit`, `dotenv`, `supertest` (together with `server/`).

## Phases

| # | Phase | Units | Depends on | Status | Confidence |
| --- | --- | --- | --- | --- | --- |
| 0 | Foundation: Prisma in Next, env, `route()` wrapper (errors, Zod, auth, CSRF, limits, cookies), utils, mailer, security headers, test harness | shared | – | done (see Phase 0 verification) | unit-tested, typechecked, consumed by Phases 1–5 (foundation criterion) |
| 1 | auth, users, addresses, contact | 16 | 0 | done | 96 (skeptic re-review; first pass 88) |
| 2 | categories, products | 8 | 0 | done | 96 (skeptic re-review; first pass 95) |
| 3 | cart, wishlist, coupons | 13 | 0 | done | 96 (skeptic re-review, with Phase 4; first pass 94) |
| 4 | orders, payments | 7 | 0, 3 | done | 96 (skeptic re-review, with Phase 3; first pass 94) |
| 5 | uploads, admin (dashboard, products, categories, orders, customers, coupons, banners, settings/pincodes, contact messages, audit log, reviews) | 49 | 0 | done | 96 (skeptic confirmation after the CSV 304 fix; first pass 93, re-review 94) |
| 6 | Cutover: relative `/api`, remove `server/`, scripts, full E2E of storefront + admin | – | 1–5 | in-progress | – |

1-pre service layer: done (2026-09-26). Every module service and schema is in `client/src/server/modules/**`; see "Module services and schemas" under the Reuse index. Route agents only write `app/api/**/route.ts`.

Phases 1–5 touch disjoint folders and can run in parallel once Phase 0 is verified; the reuse index below is frozen during that fan-out.

## Unit checklist

93 endpoints: every `router.<method>("…")` in `server/src/modules/*/*.routes.ts` and the admin sub-routers (`admin.*.ts`, mounted in `admin.routes.ts`), cross-checked against the 93 endpoint rows in `docs/API.md`. Paths are under `client/src/`.

- [x] GET /api/health → `app/api/health/route.ts` (Phase 0)
- [x] any other /api path, every method → `app/api/[...slug]/route.ts` (Phase 0: Express `notFound`, 404 JSON)

### Rules for every route.ts (Phases 1–5)

- Export all five methods through `methods()`: `export const { GET, POST, PUT, PATCH, DELETE } = methods({ GET: route(…) })`. A missing export makes Next answer an empty 405; Express answered 404 JSON. Files under a router with `router.use(...)` use `guardedMethods(<guard from http/guards.ts>, {…})`; admin files use `adminMethods({…})`; a static folder next to a `[param]` sibling uses `staticTwin(sibling, params, {…})` (see the consolidation section).
- Carry over each Express route's middleware as `route()` options: `requireAuth` → `auth: "user"`; `requireAuth, requireAdmin` → `auth: "admin"`; `optionalAuth` → `auth: "optional"`; `publicCache` → `cache: "public"`; `noStore` → `cache: "no-store"`; `validate({ body, query, params })` → the same schemas; limiters → `limiter` (an array when there are several, e.g. `GET /api/cart` = `[cartLimiter, couponLimiter]`). Router-level `router.use(...)` applies to every route in the file.
- `res.status(201).json(x)` → `return created(x)` (or `promise.then(created)`). `res.status(204).end()` → `return noContent()` (or `.then(noContent)`). `ctx.setStatus(n)` stays for computed statuses. `issueSession(res, …)` → `issueSession(ctx, …)`. `req.validated.params` → `ctx.params`, `req.body` → `ctx.body`, `req.user!` → `ctx.user` (typed non-null for `auth: "user" | "admin"`).
- Services move to `src/server/modules/<name>/` with relative, extensionless imports (`../../lib/prisma`, not `../../lib/prisma.js`).

### Route conflicts and flags (checked against the Next 16 build, 2026-09-26)

- **Static beats `[param]`** (verified with `next build` + `next start`): `products/home` vs `products/[slug]`, `admin/categories/tree` vs `[id]`, `admin/products/bulk` vs `[id]`, `admin/banners/reorder` vs `[id]`, `admin/settings/pincodes/bulk` vs `[pincode]`, `cart/merge` vs `[itemId]`, `admin/orders/export.csv` vs `[orderNumber]`. Same as Express, where these were registered before the `/:param` route.
- **Methods on a static twin (fixed in consolidation)**: in Express, `PATCH /api/cart/merge` fell through to `PATCH /:itemId` and got `400 VALIDATION_ERROR` (itemId "merge"). In Next the static folder wins for every method. `staticTwin()` now sends every method the static file doesn't define to the sibling `[param]` handler with the literal as the param: `cart/merge`, `admin/categories/tree`, `admin/products/bulk`, `admin/banners/reorder`, `admin/settings/pincodes/bulk`. `products/home` and `admin/orders/export.csv` need nothing: their siblings define no other methods, so both sides are a plain 404.
- **`admin/orders/export.csv`**: a folder named `export.csv` works as a Route Handler segment. Verified: a probe `app/api/zz-probe/export.csv/route.ts` served `text/csv` under `next start` (the probe was removed). Next's docs use the same pattern (`app/rss.xml/route.ts`). Return a `Response` (a stream is fine) from the handler; `route()` adds its headers. If the stream fails midway, the connection is just cut, which replaces Express's `headersSent` rule.
- **`params` are URL-decoded by Next** (`/a%20b` → `"a b"`, `%E2%9C%93` → `"✓"`), the same as Express: the raw path is split on `/` first and each dynamic segment is `decodeURIComponent`-ed, so `%2F` stays inside one param (`APS%2F1` → `"APS/1"`). Static folders match the **raw** segment (`/api/products/hom%65` is the `[slug]` `"home"`, not `products/home`; Express matched the raw path too). Verified under `next start`; `test/helpers/router.ts` does the same.
- **Admin sub-router order**: `router.use(requireAuth, requireAdmin, adminLimiter, auditAdminMutations)` becomes `route({ auth: "admin", limiter: adminLimiter, after: <audit hook> })` on every admin route. Phase 5 owns the audit hook (a port of `auditAdminMutations` as an `after` callback, in `src/server/modules/admin/`). `after` runs only once auth and the limiters have passed, so 429s aren't recorded, as before. Suggest a local `adminRoute()` helper in that folder.
- **Uploads (Phase 5)**: use `route({ auth: "admin", limiter: uploadLimiter, rawBody: true })` and `await ctx.req.formData()`. CSRF already allows multipart only under `/api/uploads/`. Route Handlers have **no body size limit**, so check `Content-Length` (10 × 5 MB + slack) before `formData()` and enforce the per-file 5 MB / 10 files / `files` field rules yourself (multer did this). Map the errors to the same 400/413/415 codes.
- **Orders (Phase 4)**: read `Idempotency-Key` with `ctx.req.headers.get("idempotency-key")`.
- **Known Next-vs-Express gaps (accepted)**: `GET /api` (no segment) serves Next's HTML 404 and not JSON, because `[...slug]` needs at least one segment. A trailing slash (`/api/health/`) gets a 308 redirect. Paths are case-sensitive; Express was case-insensitive. There are no CORS headers: the API is same-origin now, so `cors({ origin: CLIENT_URL })` is dropped. Next answers OPTIONS itself with `204 Allow: …`.

### Phase 1: auth, users, addresses, contact (16)

- [x] POST /api/auth/signup → `app/api/auth/signup/route.ts`
- [x] POST /api/auth/login → `app/api/auth/login/route.ts`
- [x] POST /api/auth/admin/login → `app/api/auth/admin/login/route.ts`
- [x] POST /api/auth/logout → `app/api/auth/logout/route.ts`
- [x] GET /api/auth/me → `app/api/auth/me/route.ts`
- [x] POST /api/auth/forgot-password → `app/api/auth/forgot-password/route.ts`
- [x] POST /api/auth/reset-password → `app/api/auth/reset-password/route.ts`
- [x] GET /api/users/me/profile → `app/api/users/me/profile/route.ts`
- [x] PATCH /api/users/me → `app/api/users/me/route.ts`
- [x] POST /api/users/me/change-password → `app/api/users/me/change-password/route.ts`
- [x] GET /api/addresses → `app/api/addresses/route.ts`
- [x] POST /api/addresses → `app/api/addresses/route.ts`
- [x] PATCH /api/addresses/:id → `app/api/addresses/[id]/route.ts`
- [x] DELETE /api/addresses/:id → `app/api/addresses/[id]/route.ts`
- [x] PATCH /api/addresses/:id/default → `app/api/addresses/[id]/default/route.ts`
- [x] POST /api/contact → `app/api/contact/route.ts`

### Phase 2: categories, products (8)

- [x] GET /api/categories → `app/api/categories/route.ts`
- [x] GET /api/categories/:slug → `app/api/categories/[slug]/route.ts`
- [x] GET /api/products → `app/api/products/route.ts`
- [x] GET /api/products/home → `app/api/products/home/route.ts`
- [x] GET /api/products/:slug → `app/api/products/[slug]/route.ts`
- [x] GET /api/products/:slug/similar → `app/api/products/[slug]/similar/route.ts`
- [x] GET /api/products/:slug/reviews → `app/api/products/[slug]/reviews/route.ts`
- [x] POST /api/products/:slug/reviews → `app/api/products/[slug]/reviews/route.ts`

### Phase 3: cart, wishlist, coupons (13)

- [x] GET /api/cart → `app/api/cart/route.ts`
- [x] POST /api/cart → `app/api/cart/route.ts`
- [x] POST /api/cart/merge → `app/api/cart/merge/route.ts`
- [x] PATCH /api/cart/:itemId → `app/api/cart/[itemId]/route.ts`
- [x] DELETE /api/cart/:itemId → `app/api/cart/[itemId]/route.ts`
- [x] POST /api/cart/:itemId/move-to-wishlist → `app/api/cart/[itemId]/move-to-wishlist/route.ts`
- [x] DELETE /api/cart → `app/api/cart/route.ts`
- [x] GET /api/wishlist → `app/api/wishlist/route.ts`
- [x] POST /api/wishlist → `app/api/wishlist/route.ts`
- [x] DELETE /api/wishlist/:productId → `app/api/wishlist/[productId]/route.ts`
- [x] POST /api/wishlist/:productId/move-to-cart → `app/api/wishlist/[productId]/move-to-cart/route.ts`
- [x] GET /api/coupons/available → `app/api/coupons/available/route.ts`
- [x] POST /api/coupons/apply → `app/api/coupons/apply/route.ts`

### Phase 4: orders, payments (7)

- [x] POST /api/orders → `app/api/orders/route.ts`
- [x] GET /api/orders → `app/api/orders/route.ts`
- [x] GET /api/orders/:orderNumber → `app/api/orders/[orderNumber]/route.ts`
- [x] POST /api/orders/:orderNumber/cancel → `app/api/orders/[orderNumber]/cancel/route.ts`
- [x] GET /api/payments/pincode/:pincode → `app/api/payments/pincode/[pincode]/route.ts`
- [x] GET /api/payments/methods → `app/api/payments/methods/route.ts`
- [x] POST /api/payments/verify → `app/api/payments/verify/route.ts`

### Phase 5: uploads, admin (49)

- [x] POST /api/uploads/image → `app/api/uploads/image/route.ts`
- [x] DELETE /api/uploads/image → `app/api/uploads/image/route.ts`
- [x] GET /api/admin/dashboard → `app/api/admin/dashboard/route.ts`
- [x] GET /api/admin/products → `app/api/admin/products/route.ts`
- [x] POST /api/admin/products/bulk → `app/api/admin/products/bulk/route.ts`
- [x] GET /api/admin/products/:id → `app/api/admin/products/[id]/route.ts`
- [x] POST /api/admin/products → `app/api/admin/products/route.ts`
- [x] PATCH /api/admin/products/:id → `app/api/admin/products/[id]/route.ts`
- [x] PATCH /api/admin/products/:id/status → `app/api/admin/products/[id]/status/route.ts`
- [x] DELETE /api/admin/products/:id → `app/api/admin/products/[id]/route.ts`
- [x] GET /api/admin/categories → `app/api/admin/categories/route.ts`
- [x] GET /api/admin/categories/tree → `app/api/admin/categories/tree/route.ts`
- [x] GET /api/admin/categories/:id → `app/api/admin/categories/[id]/route.ts`
- [x] POST /api/admin/categories → `app/api/admin/categories/route.ts`
- [x] PATCH /api/admin/categories/:id → `app/api/admin/categories/[id]/route.ts`
- [x] DELETE /api/admin/categories/:id → `app/api/admin/categories/[id]/route.ts`
- [x] GET /api/admin/orders → `app/api/admin/orders/route.ts`
- [x] GET /api/admin/orders/export.csv → `app/api/admin/orders/export.csv/route.ts`
- [x] GET /api/admin/orders/:orderNumber → `app/api/admin/orders/[orderNumber]/route.ts`
- [x] PATCH /api/admin/orders/:orderNumber/status → `app/api/admin/orders/[orderNumber]/status/route.ts`
- [x] GET /api/admin/customers → `app/api/admin/customers/route.ts`
- [x] GET /api/admin/customers/:id → `app/api/admin/customers/[id]/route.ts`
- [x] PATCH /api/admin/customers/:id/status → `app/api/admin/customers/[id]/status/route.ts`
- [x] PATCH /api/admin/customers/:id/role → `app/api/admin/customers/[id]/role/route.ts`
- [x] GET /api/admin/coupons → `app/api/admin/coupons/route.ts`
- [x] GET /api/admin/coupons/:id → `app/api/admin/coupons/[id]/route.ts`
- [x] POST /api/admin/coupons → `app/api/admin/coupons/route.ts`
- [x] PATCH /api/admin/coupons/:id → `app/api/admin/coupons/[id]/route.ts`
- [x] DELETE /api/admin/coupons/:id → `app/api/admin/coupons/[id]/route.ts`
- [x] GET /api/admin/banners → `app/api/admin/banners/route.ts`
- [x] PUT /api/admin/banners/reorder → `app/api/admin/banners/reorder/route.ts`
- [x] GET /api/admin/banners/:id → `app/api/admin/banners/[id]/route.ts`
- [x] POST /api/admin/banners → `app/api/admin/banners/route.ts`
- [x] PATCH /api/admin/banners/:id → `app/api/admin/banners/[id]/route.ts`
- [x] DELETE /api/admin/banners/:id → `app/api/admin/banners/[id]/route.ts`
- [x] GET /api/admin/settings → `app/api/admin/settings/route.ts`
- [x] PUT /api/admin/settings → `app/api/admin/settings/route.ts`
- [x] GET /api/admin/settings/pincodes → `app/api/admin/settings/pincodes/route.ts`
- [x] POST /api/admin/settings/pincodes → `app/api/admin/settings/pincodes/route.ts`
- [x] POST /api/admin/settings/pincodes/bulk → `app/api/admin/settings/pincodes/bulk/route.ts`
- [x] PATCH /api/admin/settings/pincodes/:pincode → `app/api/admin/settings/pincodes/[pincode]/route.ts`
- [x] DELETE /api/admin/settings/pincodes/:pincode → `app/api/admin/settings/pincodes/[pincode]/route.ts`
- [x] GET /api/admin/contact-messages → `app/api/admin/contact-messages/route.ts`
- [x] PATCH /api/admin/contact-messages/:id → `app/api/admin/contact-messages/[id]/route.ts`
- [x] DELETE /api/admin/contact-messages/:id → `app/api/admin/contact-messages/[id]/route.ts`
- [x] GET /api/admin/audit-log → `app/api/admin/audit-log/route.ts`
- [x] GET /api/admin/reviews → `app/api/admin/reviews/route.ts`
- [x] GET /api/admin/reviews/:id → `app/api/admin/reviews/[id]/route.ts`
- [x] DELETE /api/admin/reviews/:id → `app/api/admin/reviews/[id]/route.ts`

## Reuse index

Frozen during the Phase 1–5 fan-out. All paths are under `client/`. Import in route files through `@/server/...`; inside `src/server` use relative, extensionless imports.

| Unit | Target path | Signature | Purpose |
| --- | --- | --- | --- |
| `route` | `src/server/http/route.ts` | `route<A, P, Q, B>(options: { auth?: "optional" \| "user" \| "admin"; limiter?: Limiter \| Limiter[]; params?: ZodType; query?: ZodType; body?: ZodType; rawBody?: boolean; cache?: "public" \| "no-store"; cacheAfterLimiters?: boolean; after?: (ctx: AfterContext, res: Response) => void }, handler: (ctx: HandlerContext) => unknown): RouteHandler` | The Express pipeline for one handler, in this order: CSRF → JSON body (1 MB, strict, charset/encoding) → apiLimiter → auth (+ `no-store`) → route limiters (+ `no-store` instead, with `cacheAfterLimiters`: only `POST /coupons/apply`, whose Express order was `couponLimiter, noStore`) → Zod (`body.x`/`query.x`/`params.x`) (+ `public` cache) → handler. It serialises returned data as JSON (Decimal → number) with Express's weak ETag; a fresh conditional GET/HEAD 2xx becomes 304 (no body, other headers kept). `undefined` gives an empty body; a returned `Response` gets the wrapper's headers merged in. `rawBody` leaves only a multipart body unread (JSON is still parsed first, as express.json ran before multer). Throws map to the standard error shape |
| `HandlerContext` | `src/server/http/route.ts` | `{ req: Request; url: URL; method: string; ip: string; user: AuthUser (auth user/admin) \| AuthUser \| undefined; params; query; body; headers: Headers; setStatus(n): void; setCookie(name, value, opts?): void; clearCookie(name, opts?): void }` | What a handler receives. `params`/`query`/`body` are parsed when a schema is given, else raw. `headers` adds response headers |
| `RouteHandler` | `src/server/http/route.ts` | `(req: Request, ctx: { params: Promise<Record<string, string \| string[] \| undefined>> }) => Promise<Response>` | The type of each exported METHOD |
| `methods` / `MethodHandlers` / `HttpMethod` | `src/server/http/route.ts` | `methods(defs: Partial<MethodHandlers>, fallback: RouteHandler = notFound): MethodHandlers` (`MethodHandlers = Record<"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE", RouteHandler>`) | Fills unimplemented methods with `fallback` (Express 404, not Next 405). Usage: `export const { GET, POST, PUT, PATCH, DELETE } = methods({...})` |
| `notFound` / `throwNotFound` | `src/server/http/route.ts` | `notFound: RouteHandler`; `throwNotFound(ctx: { method; url }): never` | `404 Route not found: METHOD /path` (CSRF and apiLimiter still apply). `throwNotFound` is the handler body, for guarded fallbacks |
| `guardedMethods` / `Guard` | `src/server/http/route.ts` | `guardedMethods(guard: Pick<RouteOptions, "auth" \| "limiter" \| "cache" \| "after">, defs: Partial<MethodHandlers>): MethodHandlers` | `methods()` whose fallback is `route(guard, throwNotFound)`: an Express router with `router.use(...)` ran that middleware before the 404 (guest 401, then 404 with `no-store`/limiter). `guardedMethods(guard, {})` is a whole catch-all file |
| `staticTwin` | `src/server/http/route.ts` | `staticTwin(sibling: MethodHandlers, params: RawParams, defs: Partial<MethodHandlers>): MethodHandlers` | A static folder beside `[param]` (`bulk`, `reorder`, `tree`, `merge`): methods not in `defs` call `sibling[m]` with `params` (Express fall-through to `/:param`). Usage: `import * as byId from "../[id]/route"`, then `staticTwin(byId, { id: "bulk" }, { POST: … })` |
| `created` / `noContent` | `src/server/http/route.ts` | `created(data: unknown): Response` (201 JSON, Decimal → number); `noContent(): Response` (204) | Handler return values; `route()` merges its headers (cookies, RateLimit, cache) into them |
| `userGuard` / `cartGuard` / `uploadGuard` | `src/server/http/guards.ts` | `{ auth: "user" }`; `{ auth: "user", cache: "no-store", limiter: cartLimiter }`; `{ auth: "admin", limiter: uploadLimiter }` | The Express `router.use(...)` of users/addresses/orders/payments(after the public GETs), cart/wishlist, and uploads. Spread into each `route()` and pass to `guardedMethods` |
| `idParam` / `idParams` / `IdParams` | `src/server/utils/params.ts` | `idParam = z.coerce.number().int().positive()`; `idParams = z.object({ id: idParam })` | Numeric path params. Re-exported as `admin.shared` `idParams` and `addresses.schemas` `addressIdParams`; cart `itemParams` / wishlist `productParams` build on `idParam` |
| `pincodeParams` | `src/server/modules/payments/pincode.ts` | `z.object({ pincode: pincodeSchema })` | One definition, re-exported by `payments.schemas` and `admin.settings.schemas` |
| `checkSameOrigin` | `src/server/http/route.ts` | `(req: Request, pathname: string) => void` (throws 403 CSRF / 415) | Port of `middleware/csrf.ts`. Already run by `route()` |
| `readJsonBody` | `src/server/http/route.ts` | `(req: Request) => Promise<unknown>` | express.json (body-parser 2.3): a charset not starting with `utf-` → 415 `unsupported charset "X"` (code `ERROR`, as Express's error handler mapped it); `Content-Encoding` gzip/deflate/br inflated, anything else → 415 `unsupported content encoding "x"`; 1 MB limit on the inflated bytes (413); a corrupt stream → 400 with zlib's message; strict, bad JSON is 400 `BAD_REQUEST`, an empty body is `{}`, non-JSON is `undefined`. Already run by `route()` |
| `jsonResponse` | `src/server/http/route.ts` | `(data: unknown, status = 200, headers?: Headers) => Response` | Same bytes and headers as Express `res.json` (Decimal → number, `application/json; charset=utf-8`, weak `ETag` on every status) |
| `weakEtag` / `isFresh` / `notModified` | `src/server/http/etag.ts` | `weakEtag(body: string): string`; `isFresh(method, status, reqHeaders, resHeaders): boolean`; `notModified(res): Response` | The `etag` package's weak tag (`W/"<len hex>-<sha1 base64[0..27)>"`) and Express `req.fresh` / the 304 (drops Content-Type/Length/Transfer-Encoding, keeps the rest). `errorResponse` tags error bodies too |
| `toHttpError` / `errorResponse` / `zodDetails` | `src/server/http/errors.ts` | `toHttpError(err: unknown): HttpError`; `errorResponse(err: unknown, headers?: Headers): Response`; `zodDetails(e: ZodError): ErrorDetail[]` | Port of `middleware/error.ts`: HttpError, ZodError → 400, P2002 → 409 (details `[{ path: field }]`, none for PRIMARY), P2025 → 404, http-errors `expose`; 500 → "Internal server error" in production; stack only logged |
| `resolveUser` / `authenticate` | `src/server/http/auth.ts` | `resolveUser(cookies: Record<string,string>, authorization: string \| null): Promise<AuthUser \| null>`; `authenticate(mode: AuthMode, cookies, authorization): Promise<AuthUser \| undefined>` | JWT from the `token` cookie or a Bearer header, HS256 only, then a DB re-check of isActive/role/passwordChangedAt (whole seconds). `user` → 401, `admin` → 401/403, `optional` → guest on any failure. Already run by `route()` |
| `issueSession` / `clearSession` | `src/server/http/session.ts` | `issueSession(res: CookieSink, user: AuthUser, remember = false): void`; `clearSession(res: CookieSink): void` | Signs `{ id, role }` (HS256, 7d/30d from env) into the httpOnly `token` cookie (Lax, Secure in production, path /). Pass the handler `ctx` as `res` |
| `AuthUser` / `Role` / `CookieSink` | `src/server/http/session.ts` | `{ id: number; role: "CUSTOMER" \| "ADMIN" }`; `{ setCookie; clearCookie }` | Shared types |
| `parseCookies` / `serializeCookie` / `serializeClearedCookie` / `CookieOptions` | `src/server/http/cookies.ts` | `parseCookies(header: string \| null): Record<string,string>`; `serializeCookie(name, value, opts?: { httpOnly?, secure?, sameSite?, path?, domain?, maxAge? (ms), expires? }): string`; `serializeClearedCookie(name, opts?): string` | Cookie handling without `next/headers`. Output matches Express `res.cookie` / `res.clearCookie` |
| `SESSION_COOKIE` / `SESSION_COOKIE_OPTIONS` / `durationMs` | `src/server/utils/auth-cookie.ts` | `"token"`; `CookieOptions`; `(v: "7d" \| "12h" \| …) => number` | Session cookie constants |
| Limiters | `src/server/http/rate-limit.ts` | `apiLimiter`, `loginLimiter`, `sensitiveLimiter`, `cartLimiter`, `orderLimiter`, `cancelLimiter`, `reviewLimiter`, `couponLimiter`, `uploadLimiter`, `adminLimiter`, `searchLimiter`: `Limiter` | Same names, limits, windows, keys, skips and `RATE_LIMIT_<NAME>` overrides as Express. Off under `NODE_ENV=test` or `RATE_LIMIT_DISABLED=1`. Draft-8 `RateLimit` / `RateLimit-Policy` headers, and `Retry-After` plus `429 RATE_LIMITED` when blocked. `loginLimiter` doesn't count responses under 400 |
| `createLimiter` / `Limiter` | `src/server/http/rate-limit.ts` | `createLimiter(name: string, windowMs: number, limit: number, opts?: { skip?(r): boolean; keyGenerator?(r): string; skipSuccessfulRequests?: boolean }): Limiter`; `Limiter.hit(req: { method, query, user?, ip }, headers: Headers): { settle(status) } \| null` | Fixed-window, in-process (per instance, and per-limiter Map). Multi-instance needs Redis/Upstash later |
| `clientIp` / `ipKeyGenerator` / `UNKNOWN_IP` | `src/server/http/client-ip.ts` | `clientIp(req: Request): string`; `ipKeyGenerator(ip: string, ipv6Subnet = 56): string` | With `TRUST_PROXY=1`, the IP is the last `X-Forwarded-For` hop (Express `trust proxy 1`). Otherwise it's `"unknown"`: a Route Handler can't see the socket and the header may be spoofed, so **all guests share one IP bucket; set TRUST_PROXY=1 in production**. IPv6 is grouped by /56 |
| `env` | `src/server/config/env.ts` | `env: { nodeEnv, isProd, trustProxy, clientUrl, databaseUrl, jwt: { secret, expiresIn, rememberExpiresIn }, cloudinary: {…}, paymentProvider, mail: {…}, rateLimitDisabled }` | Same validation as the server (required `DATABASE_URL`; `JWT_SECRET` ≥ 32 chars). Next loads the `.env*` files, so there's no dotenv. `port` was dropped (Next owns it) |
| `prisma` | `src/server/lib/prisma.ts` | `prisma: PrismaClient` (mariadb adapter, `omit: { order: { idempotencyKey: true } }`) | globalThis singleton (one pool across HMR). Generated client at `src/generated/prisma` (gitignored; `npm run db:generate -w client`) |
| `mailer` / `sendMail` / `keepAlive` / `escapeHtml` / `Mailer` / `MailMessage` | `src/server/lib/mailer.ts` | `sendMail(m: { to, subject, html, text }): Promise<void>` (never rejects; don't await it in a handler); `keepAlive(task: Promise<unknown>): void`; `escapeHtml(s: string): string` | Console or Resend, fire-and-forget: the send starts at once (response timing unchanged) and is handed to Next's `after()` so a serverless platform doesn't drop it; outside a request scope (tests, scripts) `after` throws and it stays plain fire-and-forget. `orders.emails.ts` wraps its lookup + send the same way. A failure is only logged |
| `HttpError` / `ErrorDetail` | `src/server/utils/http-error.ts` | `new HttpError(status: number, message: string, code?: string, details?: { path; message }[])` | Copied unchanged: throw it from handlers and services |
| `paginationQuery` / `toSkipTake` / `paginated` / `MAX_PAGE` / `Paginated` | `src/server/utils/pagination.ts` | as in the server | Copied unchanged |
| `cleanSearch` / `likeSafe` / `searchQuery` | `src/server/utils/search.ts` | as in the server | Copied unchanged |
| `discountPercent` | `src/server/utils/pricing.ts` | `(mrp: number, salePrice: number) => number` | Copied unchanged |
| Test client | `test/helpers/http.ts` | `request(method, path, { body?, headers?, cookieJar? }): Promise<{ status, headers, body, text }>`; `newAgent(): Agent` (`.get/.post/.put/.patch/.delete/.head/.options(path)` → a builder with `.set/.type/.send/.field/.attach`, awaitable); `api(agent?)`, `loginWith(id, pw, path?)`, `loginAs("admin" \| "customer")`, `expectError(res, status, code?)`, `ORIGIN`, `ADMIN`, `CUSTOMER`, `CookieJar` | Replaces supertest. It resolves the path against `src/app/api` (plus `test/fixtures/api`), imports the route.ts and calls the METHOD in-process. Porting: `request(app).post(p)` → `newAgent().post(p)` and `request.agent(app)` → `newAgent()`; the rest is unchanged. `loginAs` needs the Phase 1 auth routes |
| `resolveRoute` / `PathDecodeError` | `test/helpers/router.ts` | `resolveRoute(pathname: string): { file: string; params } \| null` | App Router matching: static (raw segment), then `[x]`, then `[...x]`, then `[[...x]]`, with `(group)` folders transparent and `_private` folders skipped; params decoded per segment like Next, a malformed escape throws `PathDecodeError` (the test client answers Next's plain 500) |
| DB and fixtures | `test/helpers/db.ts`, `factories.ts`, `checkout.ts` | as in `server/test/helpers` | Ported unchanged (snapshot/reset, `createUser/Product/Coupon…`, `shopper/fillCart/placeOrder/checkout`) |
| Fixture route | `test/fixtures/api/test-fixture/[op]/route.ts` | `GET\|POST /api/test-fixture/<op>` | Test-only `route()` configurations for `route.test.ts` only (auth modes, cache, Decimal, CSV Response, rawBody, setStatus/created/noContent, P2025/P2002-primary/500). Every other suite uses the real endpoints |

### Module services and schemas (step 1-pre)

All under `client/src/server/modules/`, import as `@/server/modules/<name>/<file>`. Services and schemas are the Express ones, the same queries, errors, codes and messages; only the imports changed (relative, extensionless, `../../../generated/prisma/client`, `Role` from `../../http/session`). Where Express mixed router and logic in one file, the logic now sits in `<name>.service.ts` and the Zod schemas in `<name>.schemas.ts`. A service **returns exactly what the Express handler passed to `res.json`**, unless the "Route glue" column says otherwise. It throws `HttpError`, and Prisma P2002/P2025 map through `route()`. "201" or "204" in the table means the route must call `ctx.setStatus(…)` (204: return `undefined`). `products/cache.ts` isn't ported: `publicCache` / `noStore` are `route({ cache: "public" | "no-store" })`.

| Module file | Key exports (signatures) | Purpose / route glue |
| --- | --- | --- |
| `auth/auth.schemas.ts` | `signupSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`; fields `emailField`, `mobileField`, `fullNameField`, `passwordField`; types `SignupInput`, `LoginInput` | Auth bodies. The fields are reused by users and contact |
| `auth/auth.service.ts` | `signup(input: SignupInput)`; `login(input: LoginInput, requiredRole?: Role)`; `getUser(id: number)`; `requestPasswordReset(email: string): Promise<void>`; `resetPassword(token: string, password: string): Promise<void>`; `hashPassword`, `verifyPassword`, `invalidateResetTokens(userId)`, `userSelect` | signup: `issueSession(ctx, user, body.remember)`, 201 `{ user }`. login: the same with 200 `{ user }`, and admin login is `login(body, "ADMIN")`. logout: `clearSession(ctx)` and `{ ok: true }`. me: `{ user: await getUser(ctx.user.id) }`. forgot: `{ message: "If an account exists for that email, a reset link has been sent." }`. reset: `clearSession(ctx)` and `{ message: "Password updated. Please log in with your new password." }` |
| `users/users.schemas.ts` | `updateProfileSchema`, `changePasswordSchema`; types `UpdateProfileInput`, `ChangePasswordInput` | |
| `users/users.service.ts` | `getProfile(id)` (= `getUser`); `updateProfile(userId, data: UpdateProfileInput)`; `changePassword(userId, input: ChangePasswordInput)` | Wrap as `{ user }`. change-password: then `issueSession(ctx, ctx.user)` and `{ message: "Password updated" }` |
| `addresses/addresses.schemas.ts` | `createAddressSchema`, `updateAddressSchema`, `addressIdParams`; types `CreateAddressInput`, `UpdateAddressInput`, `AddressIdParams` | |
| `addresses/addresses.service.ts` | `listAddresses(userId)`; `createAddress(userId, body)`; `updateAddress(userId, id, body)`; `deleteAddress(userId, id)`; `setDefaultAddress(userId, id)` | Wrap as `{ items }` (list) or `{ address }`. POST 201. DELETE 204 |
| `contact/contact.schemas.ts` | `contactSchema`; type `ContactInput` | |
| `contact/contact.service.ts` | `submitContactMessage(body: ContactInput): Promise<{ message }>` | **Extracted** from `contact.routes.ts`: stores the message and emails the admin (fire-and-forget). 201 |
| `categories/categories.schemas.ts` | `slugParams`; type `SlugParams` | Also re-exported by products.schemas |
| `categories/categories.service.ts` | `getCategoryTree()`; `getCategoryBySlug(slug)`; `loadCategoryIndex({ withCounts? })`, `subtreeIds`, `breadcrumbOf`, `CategoryIndex`, `CategoryNode` | Public tree and detail (`cache: "public"`) |
| `products/products.schemas.ts` | `listQuery`, `reviewsQuery`, `createReviewBody`, `slugParams`, `SORTS`; types `ListQuery`, `CreateReviewBody`, `SlugParams` | |
| `products/products.service.ts` | `listProducts(q: ListQuery, userId?)`; `getHome()`; `getProduct(slug, userId?)`; `getSimilar(slug)`; `listReviews(slug, q: PaginationQuery)`; `createReview(slug, userId, body)`; `recomputeRating(tx, productId)`; `visibleCategoryIds()`, `isPurchasable`, `purchasableProductWhere`, `summarySelect`, `toSummary`, `reviewerName`, `UNDER_PRICE` | Catalog. POST review 201 |
| `cart/cart.schemas.ts` | `cartQuery`, `itemParams`, `addBody`, `patchBody`, `mergeBody`, `MAX_QTY_PER_LINE`; types `CartQuery`, `ItemParams`, `AddBody`, `PatchBody`, `MergeBody` | |
| `cart/cart.pricing.ts` | `computeCartSummary(…)`, `computeCouponDiscount(coupon, subtotal)`, `getStoreSettings(tx?)`, `validateCoupon(code, subtotal, userId, tx?)`, `toPaise`, `toRupees`, `INVALID_COUPON`; types `Tx`, `Db`, `CartSummary`, `Money` | Money maths in paise |
| `cart/cart.service.ts` | `loadCart(userId, couponCode?, db?)`; `addItem(userId, variantId, qty)`; `addToCart(…)`; `updateItemQuantity(userId, itemId, qty)`; `removeItem(userId, itemId)`; `clearCart(userId)`; `moveToWishlist(userId, itemId)`; `mergeCart(userId, items)`; `capNotice(r)`; `publicCoupon(c)` | POST: 201 `{ ...(await loadCart(u)), added: r, notice: capNotice(r) }`. merge: `{ ...(await loadCart(u)), ...r }`. PATCH: `{ ...(await loadCart(u)), notice: capNotice(r) }`. DELETE, move-to-wishlist and clear: then `loadCart(u)`. GET: `loadCart(u, query.coupon)` |
| `wishlist/wishlist.schemas.ts` | `productParams`, `addBody`, `moveBody`; types `ProductParams`, `AddBody`, `MoveBody` | GET uses `paginationQuery` (utils) |
| `wishlist/wishlist.service.ts` | `listWishlist(userId, q: PaginationQuery)`; `addToWishlist(userId, productId)`; `removeFromWishlist(userId, productId)`; `moveToCart(userId, productId, variantId, qty)` | POST status is `result.added ? 201 : 200`. move-to-cart: `{ productId, inWishlist: false, cartItem: r, notice: capNotice(r) }` |
| `coupons/coupons.schemas.ts` | `applyBody`; type `ApplyBody` | |
| `coupons/coupons.service.ts` | `listAvailableCoupons(userId?)`; `applyCoupon(userId, code)` | |
| `orders/orders.schemas.ts` | `placeBody`, `listQuery`, `orderParams`, `cancelBody`; types `PlaceBody`, `ListQuery`, `OrderParams`, `CancelBody` | |
| `orders/orders.status.ts` | `ORDER_TRANSITIONS`, `CANCELLABLE_STATUSES`, `canTransition(from, to)`, `assertTransition(from, to)` | Status machine |
| `orders/orders.emails.ts` | `notifyOrderPlaced(orderNumber): void`; `notifyOrderStatus(orderNumber, status, note?): void` | Fire-and-forget emails |
| `orders/orders.service.ts` | `placeOrder(userId, input: PlaceOrderInput, idempotencyKey?)`; `listOrders(userId, q)`; `getOrderDetail(userId, orderNumber)`; `cancelOrder(userId, orderNumber, reason?)`; `cancelOrderTx(tx, order, { note, actor })`; `orderDetailInclude`; `generateOrderNumber()`; **new** `parseIdempotencyKey(header: string \| null \| undefined): string \| undefined`; **new** `placeOrderStatus(result): 200 \| 201` | POST: `const r = await placeOrder(ctx.user.id, ctx.body, parseIdempotencyKey(ctx.req.headers.get("idempotency-key"))); ctx.setStatus(placeOrderStatus(r)); return r` (both helpers extracted from `orders.routes.ts`: 400 VALIDATION_ERROR `headers.idempotency-key`, and 200 on replay) |
| `payments/pincode.ts` | `pincodeSchema` | 6-digit pincode |
| `payments/payments.schemas.ts` | `pincodeParams`, `verifyBody`; types `PincodeParams`, `VerifyBody` | |
| `payments/provider.ts` | `activeProvider()`, `availableMethods()`, `getProvider(name)`, `providerForMethod(method)`, `codProvider`; types `PaymentProvider`, `PaymentMethod` | methods: `{ provider: activeProvider().name, methods: availableMethods() }` |
| `payments/payments.service.ts` | `checkPincode(pincode)`; `verifyPayment(userId, body: VerifyBody)` | |
| `uploads/uploads.storage.ts` | `storeImage(buf, type)`, `deleteImage({ publicId?, url? }): Promise<void>`, `sniffImageType(buf)`, `MIME_TYPES`, `LOCAL_DIR`, `cloudinaryEnabled`, `CLOUDINARY_FOLDER`; types `StoredImage`, `ImageType` | Unchanged except `LOCAL_DIR` = `path.resolve(process.cwd(), "public/uploads")`: inside a Next bundle `import.meta.url` points into `.next/`, so cwd must be `client/` |
| `uploads/uploads.schemas.ts` | `deleteSchema`, `MAX_BYTES` (5 MB), `MAX_FILES` (10); type `DeleteInput` | **Extracted** from `uploads.routes.ts` |
| `uploads/uploads.service.ts` | `readUploadFiles(request: Request): Promise<UploadFile[]>`; `uploadImages(files: UploadFile[]): Promise<{ items: StoredImage[] }>`; `MAX_UPLOAD_BODY_BYTES`; type `UploadFile { fieldname, mimetype, buffer }` | **Replaces multer.** `readUploadFiles` caps the body (Content-Length, then a streaming count, 413), parses `formData()` and applies multer's rules in part order: >15 parts, >5 fields, >10 files (400), a file outside `files` (400), a bad declared type (415), a file over 5 MB (413), malformed (400). A non-multipart request returns `[]`. `uploadImages` = the handler: 400 when empty, magic bytes vs mimetype (415 `files.<i>`), then stores them. POST: `route({ auth: "admin", limiter: uploadLimiter, rawBody: true }, async (ctx) => { const r = await uploadImages(await readUploadFiles(ctx.req)); ctx.setStatus(201); return r })`. DELETE: `route({ auth: "admin", limiter: uploadLimiter, body: deleteSchema })` → `deleteImage(body)`, 204. **Not `adminRoute`** (Express uploads had no adminLimiter and no audit) |
| `admin/admin.route.ts` | `adminRoute<P, Q, B>(options: Omit<RouteOptions<"admin", P, Q, B>, "auth" \| "after">, handler: Handler<"admin", P, Q, B>): RouteHandler`; type `AdminRouteOptions`; `adminMethods(defs: Partial<MethodHandlers>): MethodHandlers` | `adminRoute` = `route({ ...options, auth: "admin", limiter: [adminLimiter, ...options.limiter], after: auditAdminMutations }, handler)`. Use it for **every** `/api/admin/**` handler, exported through `adminMethods({...})`, whose fallback is `adminRoute({}, throwNotFound)` (401/403 before the 404, and an admin's mutating 404 is audited, as in Express). `app/api/admin/[[...slug]]/route.ts` is `adminMethods({})` |
| `admin/admin.audit.service.ts` | `auditAdminMutations(ctx: AfterContext, response: Response): void`; `listAuditLog(q: ListQuery)` | The audit `after` hook (already wired by `adminRoute`): POST/PUT/PATCH/DELETE with a user only; `url.pathname` (no query, ≤ 500); targetId is the first path segment after `/api/admin/x` that has a digit; `ctx.ip` (null when `"unknown"`); never the body; a failed insert is only `console.error("[audit] failed to record admin action", err)`. GET `/admin/audit-log` → `listAuditLog(query)` |
| `admin/admin.audit.schemas.ts` | `listQuery`; type `ListQuery` | adminId, from, to (`to ≥ from`) |
| `admin/admin.shared.ts` | `idParams`, `IdParams`, `queryBool`, `searchTerm`, `optionalText(max)`, `money`, `safeUrl`, `slugify(text)`, `uniqueSlug(base, taken)`, `toOrderBy(sort)` | Shared admin Zod pieces. `idParams` is the `:id` params for every admin route |
| `admin/admin.dashboard.service.ts` | `getDashboard()` | **Extracted**. GET `/admin/dashboard` |
| `admin/admin.products.schemas.ts` | `listQuery`, `createSchema`, `updateSchema`, `statusSchema`, `bulkSchema`; types `ListQuery`, `CreateInput`, `ProductInput`, `StatusInput`, `BulkInput` | |
| `admin/admin.products.service.ts` | `listProducts(q)`; `bulkAction(body: BulkInput)`; `getProductOr404(id)`; `createProduct(body)`; `updateProduct(id, body: ProductInput)`; `setProductStatus(id, isActive)`; `deleteProduct(id)`; `getDetail(id)`, `deleteProducts(ids)` | POST 201. DELETE returns JSON (200, not 204) |
| `admin/admin.categories.schemas.ts` | `listQuery`, `createSchema` (Express `base`), `updateSchema`; types `ListQuery`, `CreateInput`, `UpdateInput` | **Extracted** |
| `admin/admin.categories.service.ts` | `listCategories(q)`; `getCategoryTree(): Promise<TreeNode[]>`; `getCategory(id)`; `createCategory(body)`; `updateCategory(id, body)`; `deleteCategory(id): Promise<void>`; type `TreeNode` | **Extracted**. POST 201, DELETE 204. Parent 400, cycle 409 `CATEGORY_CYCLE`, in use 409 `CATEGORY_IN_USE`, banner links follow a slug change |
| `admin/admin.orders.schemas.ts` | `listQuery`, `exportQuery`, `orderParams`, `statusSchema`; types `ListQuery`, `ExportQuery`, `OrderParams`, `StatusInput` | **Extracted** (admin `orderParams` max 40, no uppercase, unlike the customer one) |
| `admin/admin.orders.service.ts` | `listOrders(q)`; `exportOrdersCsv(q: Omit<ListQuery, "page" \| "limit">): Response`; `getOrderOr404(orderNumber)`; `updateOrderStatus(orderNumber, status, note)`; `getDetail(orderNumber)` (null if missing); `csvCell(v)` | **Extracted**. export.csv: `return exportOrdersCsv(ctx.query)`, a streamed `text/csv` Response (BOM + header, batches of 500 pulled on demand, `Content-Disposition` `orders-YYYY-MM-DD.csv`, `private, no-store`) |
| `admin/admin.customers.schemas.ts` | `listQuery`, `statusSchema`, `roleSchema`; types `ListQuery`, `StatusInput`, `RoleInput` | **Extracted** |
| `admin/admin.customers.service.ts` | `listCustomers(q)`; `getCustomer(id)`; `setCustomerStatus(actorId, id, isActive)`; `setCustomerRole(actorId, id, role)` | **Extracted**. Pass `ctx.user.id` as `actorId`. 400 `SELF_DEACTIVATION` / `SELF_ROLE_CHANGE`, 409 `LAST_ADMIN`, 403 when the actor is no longer an active admin |
| `admin/admin.coupons.schemas.ts` | `listQuery`, `createSchema` (Express `base`), `updateSchema`; types `ListQuery`, `CreateInput`, `CouponInput` | **Extracted** |
| `admin/admin.coupons.service.ts` | `listCoupons(q)`; `getCoupon(id)`; `createCoupon(body)`; `updateCoupon(id, body)`; `deleteCoupon(id): Promise<void>`; `couponIssues(c)` | **Extracted**. POST 201, DELETE 204 (409 `COUPON_IN_USE`) |
| `admin/admin.banners.schemas.ts` | `listQuery`, `createSchema` (Express `base`), `updateSchema`, `reorderSchema`; types `ListQuery`, `CreateInput`, `UpdateInput`, `ReorderInput` | **Extracted** |
| `admin/admin.banners.service.ts` | `listBanners(q)`; `reorderBanners(body: ReorderInput)` → `{ items }`; `getBanner(id)`; `createBanner(body)`; `updateBanner(id, body)`; `deleteBanner(id): Promise<void>` | **Extracted**. POST 201, DELETE 204 |
| `admin/admin.settings.schemas.ts` | `settingsSchema`, `pincodeInput`, `pincodeUpdate`, `bulkSchema`, `pincodeParams`, `listQuery` (pincode list); types `SettingsInput`, `PincodeInput`, `PincodeUpdate`, `BulkInput`, `PincodeParams`, `ListQuery` | **Extracted** |
| `admin/admin.settings.service.ts` | `getSettings()`; `updateSettings(data)`; `listPincodes(q)`; `addPincode(data)`; `bulkAddPincodes(body)`; `updatePincode(code, data)`; `deletePincode(code): Promise<void>` | **Extracted**. POST pincode 201 (409 `CONFLICT` when it already exists), bulk 201, DELETE 204 |
| `admin/admin.contact.schemas.ts` | `listQuery`, `updateSchema`; types `ListQuery`, `UpdateInput` | **Extracted** |
| `admin/admin.contact.service.ts` | `listContactMessages(q)`; `updateContactMessage(id, body)`; `deleteContactMessage(id): Promise<void>` | **Extracted**. DELETE 204, an unknown id is a 404 through P2025 |
| `admin/admin.reviews.schemas.ts` | `listQuery`; type `ListQuery` | **Extracted** |
| `admin/admin.reviews.service.ts` | `listReviews(q)`; `getReview(id)`; `deleteReview(id): Promise<void>` | **Extracted**. DELETE 204 (and recomputes the product rating in the same transaction) |

## Consolidation (2026-09-26, after Phases 1–5)

- **Router-level guards before the 404** in one place: `guardedMethods` (http/route.ts) + the guards in `http/guards.ts`, and `adminMethods` (admin.route.ts). Used by every users, addresses, cart, wishlist, orders, payments, uploads and admin route.ts. The local `app/api/cart/_lib/guarded-methods.ts` is deleted.
- **Catch-alls for unknown sub-paths of guarded routers** (Express ran `router.use` for any path under the mount): `admin/[[...slug]]` (adminMethods, audited), `uploads/[[...slug]]`, `users/[[...slug]]`, `payments/[[...slug]]` (these three prefixes have no own route.ts, so `/api/users` itself is covered too), and `addresses/[...slug]`, `cart/[...slug]`, `wishlist/[...slug]`, `orders/[...slug]`. Verified under `next start`: `/api/admin`, `/api/admin/banners/reorder/extra`, `/api/addresses/1/nope`, `/api/payments/pincode` → 401 for a guest.
- **Static twins**: `staticTwin()` in banners/reorder, categories/tree, products/bulk, settings/pincodes/bulk and cart/merge.
- **Dedup**: `created()` / `noContent()` replace every `setStatus(201|204)` pair; `idParam`/`idParams` (utils/params.ts) and one `pincodeParams`.
- **Tests**: `test/admin-ops-fallbacks.ts`, `test/helpers/phase5a.ts` and `admin-ops-access.test.ts` are deleted; suites use `loginAs`/`loginWith` and `helpers/checkout.ts`. `admin-access.test.ts` is the one route table (admin + uploads, guards on unimplemented methods and catch-alls) and fails when a route file or method has no row; it asserts 401/403 for `GET /api/admin/no-such-route` again, plus the audited admin 404 (beyond the source). `reviews.test.ts` uses the real checkout and admin status route; `errors.test.ts` uses the source's real paths.
- Verification: client 17 files / 303 tests, server 13 files / 239 tests, `tsc --noEmit`, `npm run lint -w client` and `next build` clean.
- **Remaining divergence from Express** (accepted): see "Known Next-vs-Express gaps" above (`GET /api` HTML 404, trailing-slash 308, case-sensitive paths, OPTIONS 204, no CORS) plus the in-process rate limiter and the `unknown` IP bucket without `TRUST_PROXY=1`.

## Parity fixes after the skeptic review (2026-09-26)

- **ETag / 304**: every JSON body (data, `created()`, errors, 429s) carries Express's weak ETag; a GET/HEAD 2xx whose `If-None-Match` matches (list, weak/strong, `*`; `Cache-Control: no-cache` forces stale) is 304 with no body and its Cache-Control/Vary/Set-Cookie kept. 204s and handler-built Responses (CSV) have none, as with `res.end()`/streams. Express tagged every `res.json` (any method, any status), so the target does too, not only GET 200.
- **Body charset and Content-Encoding**: see `readJsonBody` in the reuse index. Order as in body-parser: charset → encoding → decoder → Content-Length (identity only) → inflated limit.
- **Uploads with a JSON body**: `rawBody` skips parsing only for multipart, so bad/oversized JSON to `POST /api/uploads/image` is 400/413 before the 401/403.
- **Cache header order**: `cacheAfterLimiters` on `POST /api/coupons/apply` (the only source route listing a limiter before `noStore`; cart/wishlist set `noStore` at router level before their limiters), so its 429 has no Cache-Control while `GET /api/cart?coupon=`'s 429 keeps `private, no-store`.
- **Emails**: `keepAlive()` / `after()` for password reset, contact notify, order confirmation and status/cancel emails.
- **Tests**: `test/parity.test.ts` (ETag/304 on `/api/auth/me`, `/api/products`, `/api/addresses`, `/api/cart`; charset/encoding; uploads JSON order; encoded order number and slug) and `test/limiters.test.ts` (shared coupon counter across `GET /api/cart?coupon=` and apply with both 429 header sets, orders, cancel, reviews, search with blank/missing/repeated `q`). `admin-access.test.ts` asserts exactly 49 admin + uploads handlers and that they equal the Phase 5 checklist above.
- **Real router** (`next build` + `next start -p 3998`): guest `/api/addresses/5/extra`, `/api/users`, `/api/admin/no-such` → 401; `PATCH /api/cart/merge` as a user → 400 `params.itemId`; `/api/products/home` → 200; `/api/admin/orders/export.csv` as admin → `text/csv`; a fully %-encoded slug → 200; `hom%65` → the `[slug]` 404; ETag → 304 (GET and HEAD); gzip body → 201, latin1 → 415, `xz` → 415; bad JSON to uploads as a guest → 400; the 21st coupon apply → 429 without Cache-Control, `GET /api/cart?coupon=` 429 with `private, no-store`; the contact email logged through `after()`.
- Verification: client 19 files / 325 tests (fresh `apsare_test`), then server 13 files / 239 tests, `tsc --noEmit`, `npm run lint -w client` and `next build` clean.

### Remaining accepted differences

- Everything under "Known Next-vs-Express gaps" above, plus the in-process rate limiter.
- **Client IP / audit `ip`**: without `TRUST_PROXY=1` the IP is `"unknown"`, so `AdminAuditLog.ip` is null (Express had the socket address) and all guests share one limiter bucket. **Production must set `TRUST_PROXY=1`** behind its proxy.
- **Upload size ordering**: the body is capped at 51 MB (`MAX_UPLOAD_BODY_BYTES`, 10 × 5 MB + 1 MB) before `formData()`, then the multer rules run in part order. Multer streamed and failed at the first offending part, so a body over 51 MB whose early parts break another rule (e.g. a bad type in part 1) gets 413 here but 415/400 from Express.
- **Default part content-type**: a file part without Content-Type is `text/plain` in both (undici and busboy), so the 415 message matches; only an explicitly empty type falls back to `application/octet-stream` here.
- **`LOCAL_DIR`** (local uploads) is `path.resolve(process.cwd(), "public/uploads")`: Next's convention is to run `next start` from `client/`; started elsewhere, local uploads land in the wrong folder (Cloudinary is unaffected).
- **Malformed percent-escapes** (`/api/products/%E0%A4%A`): Next answers a plain-text 500 before any handler runs; Express gave 400 JSON (`Failed to decode param`).
- **Rare charsets**: `utf-7` and `utf-32` (accepted by iconv-lite) get 415 here, because `TextDecoder` doesn't know them. utf-8 (with or without BOM), utf-16, utf-16le and utf-16be match.
- **Next's own `Vary`** (`rsc, next-router-state-tree, …`) is sent next to ours on API responses under `next start`.

## Phase 0 verification (2026-09-26)

- Libraries: `@prisma/client@^7.10.0`, `@prisma/adapter-mariadb@^7.10.0`, `bcryptjs@^3.0.3`, `jsonwebtoken@^9.0.3`, `zod@^4.6.5`, `cloudinary@^2.11.0`; dev: `prisma@^7.10.0`, `@types/jsonwebtoken@^9.0.10`, `vitest@^5.0.2`, `tsx@^4.23.15`. These match `server/`. npm's allow-scripts skipped the Prisma postinstall scripts; `prisma generate` and `migrate status` work without them.
- Prisma: `client/prisma/` holds the schema (unchanged; generator output `../src/generated/prisma`), the 3 migrations and the seed (imports repointed to `src/server`). `client/prisma.config.ts` loads env with `@next/env`'s `loadEnvConfig`, which ships with Next, so there's no dotenv. `npm run db:generate -w client` works, and `prisma migrate status` on `apsare` reports "Database schema is up to date!" (3 migrations). No new migration.
- Env: `client/.env.local` (gitignored by `client/.gitignore` `.env*`) was copied from `server/.env` by script, without `NODE_ENV`/`PORT`. `NEXT_PUBLIC_API_URL` is deliberately **not** set yet, so the storefront keeps using the Express oracle until Phase 6. `client/.env.example` defaults it to `/api`. `client/.env.test.example` is optional.
- Scripts in `client/package.json`: `db:generate`, `db:migrate`, `db:deploy`, `db:status`, `db:seed`, `test`, `test:watch`.
- `next.config.ts`: helmet's default headers on `/api/:path*`, a safe subset on pages (nosniff, `X-Frame-Options: SAMEORIGIN`, `strict-origin-when-cross-origin`), `poweredByHeader: false`, and `serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"]` (`@prisma/client` is already on Next's default list). `images` is unchanged.
- `cd client && npx tsc --noEmit`: clean. `npm run lint -w client`: clean.
- `npm test -w client`: 4 files, 33 tests passing (`errors`, `csrf`, `rate-limit`, `route`) against `apsare_test`. Don't run it at the same time as the server suite, because they share that database.
- `npx next build`: passes. `/api/health` and `/api/[...slug]` are dynamic (ƒ); the storefront and admin pages are unchanged. Smoke-tested with `next start`: health 200 with the RateLimit and security headers, unknown path 404 JSON, `PUT /api/health` 404 JSON, foreign-Origin POST 403 CSRF, no `X-Powered-By`.
- `npm test -w server`: 13 files, 239 tests still passing. `server/**` is untouched.
- Next 16 notes: `params` is a Promise (the wrapper awaits it). Route Handlers use the Node runtime by default, with no `runtime` export needed. They aren't cached (no `cacheComponents`), so GETs run per request. `env.ts` throws at module load, so `next build` needs the server env (`.env.local` or CI secrets), because it evaluates route modules while collecting page data. `vitest` prints a harmless Vite "configLoader native" warning: `client/package.json` has no `"type": "module"`, and changing that would affect Next.
