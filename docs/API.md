# Label Apsáre: API contract

The REST API served by the Next.js app itself: Route Handlers in `client/src/app/api/**/route.ts`, backed by the services in `client/src/server/modules/**`. This file is the contract between those modules and the storefront/admin UI. **When you change a module, update its section**: exact request bodies, query params and response shapes.

## Conventions

### Base URL

- Same-origin `/api` (local: `http://localhost:3000/api`). Browser code calls it through `api()` in `client/src/lib/api.ts`; `NEXT_PUBLIC_API_URL` overrides the base and defaults to `/api`.
- Server Components don't call `/api` over HTTP: they use `client/src/server/queries.ts`, which runs the same services and schemas and returns the same JSON shapes.
- Health check: `GET /api/health` → `{ "ok": true }`
- JSON in and out. Request bodies are limited to 1 MB (uploads use multipart).

### Auth

- Session = JWT `{ id, role }` in an **httpOnly cookie named `token`** (`SameSite=Lax`, `Secure` in production). 7 days by default, 30 days with "remember me".
- The client must send `credentials: "include"` (the `api()` helper in `client/src/lib/api.ts` does this). A `Authorization: Bearer <jwt>` header is also accepted (for tools and tests).
- Server helpers:
  - `issueSession(ctx, { id, role }, remember)` / `clearSession(ctx)` in `client/src/server/http/session.ts`
  - `route({ auth: "user" })`: 401 unless there is a valid session **and** the user still exists and is active (one primary-key lookup per request, so disabling a user or changing a role takes effect immediately). Sets `ctx.user = { id, role }`.
  - Tokens are HS256 only, and `JWT_SECRET` must be at least 32 characters (the server refuses to start otherwise).
  - Changing or resetting a password sets `User.passwordChangedAt`; any token issued before it (compared in whole seconds, the resolution of `iat`) gets `401`. So a password change logs out every other device.
  - `auth: "optional"`: same, but a missing or bad token just means guest (`ctx.user` undefined). Use it for public catalog endpoints that personalise (e.g. "in wishlist").
  - `auth: "admin"`: also 403 unless `role === "ADMIN"`.
- Rate limits: see [Rate limits](#rate-limits).

### Rate limits

All limiters live in `client/src/server/http/rate-limit.ts` (a fixed-window, in-process limiter), each with its own in-memory counter (so counts are per server instance; a multi-instance deploy needs a shared store such as Redis). A blocked request gets **`429 RATE_LIMITED`** in the standard error shape, plus the IETF draft-8 headers on every limited response: `RateLimit: "<name>"; r=<remaining>; t=<seconds to reset>` and `RateLimit-Policy: "<name>"; q=<limit>; w=<window seconds>`, and `Retry-After: <seconds>` on the 429. A request can carry several `RateLimit` headers (e.g. `api` and `cart`), one per limiter it passed.

| Limiter | Applies to | Limit | Keyed by | Env override |
| --- | --- | --- | --- | --- |
| `apiLimiter` | every `/api` route | 1000 / 15 min | IP | `RATE_LIMIT_API` |
| `loginLimiter` | `POST /auth/login`, `POST /auth/admin/login` (failed attempts only) | 10 / 15 min | IP | `RATE_LIMIT_LOGIN` |
| `sensitiveLimiter` | signup, forgot/reset password, `PATCH /users/me`, `POST /users/me/change-password`, `POST /contact` (one shared counter) | 10 / 15 min | IP | `RATE_LIMIT_SENSITIVE` |
| `cartLimiter` | `POST`/`PATCH`/`DELETE` under `/cart` and `/wishlist` (one shared counter; GETs don't count) | 120 / 1 min | user | `RATE_LIMIT_CART` |
| `orderLimiter` | `POST /orders` (replays count too) | 10 / 10 min | user | `RATE_LIMIT_ORDERS` |
| `cancelLimiter` | `POST /orders/:orderNumber/cancel` | 20 / 1 h | user | `RATE_LIMIT_CANCEL` |
| `reviewLimiter` | `POST /products/:slug/reviews` | 10 / 1 h | user | `RATE_LIMIT_REVIEWS` |
| `couponLimiter` | `POST /coupons/apply` and `GET /cart?coupon=` (only when a code is sent; one shared counter, anti brute-force) | 20 / 10 min | user | `RATE_LIMIT_COUPON` |
| `searchLimiter` | `GET /products` with a non-empty `q` | 120 / 1 min | user, else IP | `RATE_LIMIT_SEARCH` |
| `uploadLimiter` | every `/uploads` request | 60 / 10 min | user | `RATE_LIMIT_UPLOADS` |
| `adminLimiter` | `POST`/`PUT`/`PATCH`/`DELETE` under `/admin` (GETs and the CSV export don't count; throttled requests are not audit-logged) | 300 / 5 min | user | `RATE_LIMIT_ADMIN` |

- "user" means the signed-in user's id (the limiter runs after auth); a guest falls back to the IP, with IPv6 grouped by /56.
- `RATE_LIMIT_<NAME>=<n>` overrides a limit (window unchanged). `NODE_ENV=test` or `RATE_LIMIT_DISABLED=1` turns **every** limiter off, so a test suite can run.
- Set `TRUST_PROXY=1` when deployed behind a proxy, so the IP is the client's. Without it a Route Handler has no trustworthy client IP and every guest shares one bucket.
- Server-rendered pages read data through `client/src/server/queries.ts`, not over HTTP, so they don't count against any limiter.

### Email

`client/src/server/lib/mailer.ts` holds the `Mailer` interface (`send({ to, subject, html, text })`), chosen by `MAIL_PROVIDER` (`env.mail.provider`):

| `MAIL_PROVIDER` | Behaviour |
| --- | --- |
| `console` (default) | Logs each email (recipient, subject and text body; in production only recipient and subject) |
| `resend` | Sends through Resend's HTTP API. Needs `RESEND_API_KEY` and `MAIL_FROM` on a verified domain |

A provider selected without its keys stops the server at startup with a clear error. Other settings: `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` (contact-form notifications). Emails are **fire-and-forget** (`sendMail()`): request handlers never wait for them, and a failure is only logged (`[mail] failed …`), so an email problem can never fail a request or an order. User-supplied text is HTML-escaped. Sent today: password reset link, contact-form notification to the admin, order confirmation, and order status changes (every admin status update, and a customer cancel).

### CSRF

The session cookie is `SameSite=Lax`, and the API is same-origin with the site. On top of that, `checkSameOrigin` (`client/src/server/http/route.ts`, the first step of every `route()`, before the body is read) checks every `POST`/`PUT`/`PATCH`/`DELETE`:

- If an `Origin` header is present (or, without one, a `Referer`), its origin must equal `CLIENT_URL`, or the request gets `403 CSRF`. `Origin: null` is rejected too. Requests with neither header (curl, server-to-server webhooks) are allowed, because browsers always send `Origin` on cross-site unsafe requests.
- The `Content-Type` must be `application/json` (`multipart/form-data` is also accepted under `/api/uploads/`), otherwise `415 UNSUPPORTED_MEDIA_TYPE`. A request with no body may omit it. An HTML form can't send JSON cross-site without a CORS preflight, and the API sends no CORS headers, so the browser refuses it.

The `api()` helper already sends `Content-Type: application/json`, so the client needs nothing extra.

### Errors

Every error response has this shape:

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [{ "path": "body.email", "message": "Invalid email address" }]
  }
}
```

| Status | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod validation failed; `details[].path` is prefixed with `body.`, `query.` or `params.` |
| 400 | `BAD_REQUEST` | Malformed JSON, or a business rule (use a specific code if the client needs to branch) |
| 401 | `UNAUTHENTICATED` | No session, bad or expired token, or disabled user |
| 403 | `FORBIDDEN` | Not an admin |
| 403 | `CSRF` | State-changing request from an origin other than `CLIENT_URL` (see CSRF) |
| 400 | `PRODUCT_INCOMPLETE` | Admin: activating a product without a variant or an image |
| 400 | `SELF_DEACTIVATION` / `SELF_ROLE_CHANGE` | Admin: disabling yourself or changing your own role |
| 403 | `ACCOUNT_DISABLED` | Login with a disabled account, or the account was disabled during checkout |
| 404 | `NOT_FOUND` | Unknown route, or record missing (Prisma P2025) |
| 409 | `CONFLICT` | Unique constraint (Prisma P2002); `details[0].path` names the field, e.g. `email`. A primary-key clash gives `"Already exists"` with no `details`. Signup never names the field |
| 409 | `LAST_ADMIN` | Admin: the change would leave no active admin |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | State-changing request that isn't JSON (see CSRF), or an upload of a disallowed type |
| 429 | `RATE_LIMITED` | Rate limit hit (see [Rate limits](#rate-limits)) |
| 501 | `NOT_IMPLEMENTED` | Feature stubbed for the active configuration (e.g. `POST /payments/verify` with the cod provider) |
| 500 | `INTERNAL` | Unexpected error. The message is generic in production and stack traces are only logged |

Server side, throw `new HttpError(status, message, code?, details?)` from `client/src/server/utils/http-error.ts`; `route()` turns any throw (or rejected promise) into this shape. Client side, `api()` throws `ApiError { status, message, code, details, fieldErrors }`.

### Validation

`route({ body?, query?, params? }, handler)` from `client/src/server/http/route.ts`, with Zod v4 schemas:

```ts
export const { GET, POST, PUT, PATCH, DELETE } = methods({
  GET: route({ query: listQuery }, ({ query }) => list(query)),
  POST: route({ auth: "admin", body: createSchema }, ({ body }) => create(body).then(created)),
});
```

- The handler gets the parsed (and stripped) values as `ctx.body`, `ctx.query` and `ctx.params`.
- A method the file doesn't define answers `404 NOT_FOUND` JSON (not Next's 405), through `methods()`.
- Use `z.coerce.number()` for numeric query and path params.

### Pagination

Every list endpoint accepts `?page=` (1–10000, default 1) and `?limit=` (1–100, default 20); anything else (0, decimals, `abc`, `1e20`) is `400 VALIDATION_ERROR`. It returns:

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 20, "total": 24, "totalPages": 2, "hasNext": true }
}
```

A page past the end is **not** an error: `200` with `items: []` and the real `meta` (`total`, `totalPages`, `hasNext: false`). With `total: 0`, `totalPages` is `0`.

Server helpers live in `client/src/server/utils/pagination.ts`: `paginationQuery` (a Zod schema you can `.extend()`), `toSkipTake(q)` (returns Prisma `{ skip, take }`) and `paginated(items, total, page, limit)`. The client type is `Paginated<T>` in `client/src/types`.

### Data formats

- Money is `Decimal(10,2)` in Postgres and is **serialised as a JSON number** in INR (`decimalReplacer` in `client/src/server/http/route.ts` converts Prisma Decimals, for the API and for `server/queries.ts`).
- Dates are ISO 8601 strings (UTC).
- `discountPercent` is always derived from `mrp` and `salePrice` using `client/src/server/utils/pricing.ts`. Never accept it from the client.
- Product search uses a functional GIN index over `to_tsvector('english', name || ' ' || brand || ' ' || code || ' ' || coalesce(description, ''))` (`product_search_idx`, created by a raw-SQL migration since Prisma's schema has no `tsvector` column type): the query builds a `to_tsquery('english', ...)` expression (every word required and prefix-matched) and ranks matches with `ts_rank`, via `prisma.$queryRaw`. Hyphenated words (product codes like `APS-SAR-001`) are matched by a parallel `code contains` clause instead of fighting `to_tsquery`'s phrase syntax — see `toTsQuery` in `client/src/server/modules/products/products.service.ts`.
- Image URLs are either absolute (Cloudinary) or site-relative (`/images/...`, served by the Next.js app from `client/public`).
- **Numbers in JSON bodies** must be JSON numbers: quantities and ids are integers ≥ 1, money has at most 2 decimals and prices are > 0. Numeric strings, booleans, decimals where an integer is expected, zero and negative values are `400 VALIDATION_ERROR` (query and path params are still parsed from strings).
- **Search text** (`q` on public and admin lists) is normalised by `cleanSearch()` in `client/src/server/utils/search.ts`: NFKC (full-width letters fold to plain ones), invisible format characters (zero-width, bidi marks) removed, control characters (NUL, tabs, newlines) turned into spaces, whitespace collapsed. Blank or invisible-only input counts as "no search". More than 100 characters after normalising is `400`. `%` and `_` always match literally.

### Seed data

`npm run db:seed` (from the repo root) is idempotent. It refuses to run with `NODE_ENV=production`, and needs `SEED_ADMIN_PASSWORD` unless `NODE_ENV` is `development` (or unset), where it falls back to `Admin@12345` with a loud warning. Passwords are only set when a user is first created: re-running never resets an existing password. Admin: `admin@labelapsare.com`. Customer: `customer@labelapsare.com` / `Customer@123`. Coupons: `WELCOME10` (first order only), `FLAT500`, `FESTIVE20`, `EXPIRED15`.

### Testing

`npm test` (from the repo root) runs the integration suite in `client/test/` with Vitest. It calls the real Route Handlers (`src/app/api/**/route.ts`) in-process, with real `Request` objects, against a real Postgres database. Postgres must be running (`docker compose up -d`).

- **Separate database.** Tests use `apsare_test` (override with `TEST_DATABASE_URL`, see `client/.env.test.example`), never the dev `apsare` database; any database whose name does not end in `_test` is refused. Each run applies migrations (`prisma migrate deploy`), empties the tables, runs the seed (admin password `Admin@Test123`, or `TEST_ADMIN_PASSWORD`) and snapshots the result into `_snap_*` tables. Every test file then starts from that snapshot.
- **If the database doesn't exist yet**, create it once: `docker compose exec postgres psql -U apsare -d apsare -c "CREATE DATABASE apsare_test OWNER apsare;"` (the `apsare` role from `docker-compose.yml` already owns it, so no extra grants are needed).
- Files run one at a time (`fileParallelism: false`) because they share the database. `NODE_ENV=test` turns the rate limiters off. Only `test/rate-limit.test.ts` switches them back on, through `RATE_LIMIT_LOGIN`.
- Helpers live in `client/test/helpers/`: `http.ts` (`api(agent)` always sends `Origin: http://localhost:3000` and JSON, `newAgent()` keeps a cookie jar, `request()` resolves a path to its `route.ts` through `router.ts`), `db.ts` (snapshot and reset), `factories.ts` (users, addresses, categories, products, variants and coupons) and `checkout.ts`.
- Uploads have no storage-dir override, so `test/uploads.test.ts` writes to `client/public/uploads` and deletes exactly the files it created.
- `npm run typecheck` type-checks the app and the tests.

---

Planned endpoints are listed below. Auth column: **public**, **optional** (`auth: "optional"`), **user** (`auth: "user"`), **admin** (`auth: "admin"`).

## Auth: `/api/auth`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/signup` | public, sensitiveLimiter | Create a customer account and start a session |
| POST | `/login` | public, loginLimiter | Email **or** mobile + password, with `remember`; sets cookie |
| POST | `/admin/login` | public, loginLimiter | Same as login, but only accepts `role = ADMIN` |
| POST | `/logout` | public | Clears the cookie |
| GET | `/me` | user | Current `User` |
| POST | `/forgot-password` | public, sensitiveLimiter | Always 200; creates a one-time reset token (sha256-hashed, 30-minute expiry) |
| POST | `/reset-password` | public, sensitiveLimiter | token + new password |

`User` (the only user shape any endpoint returns; never `passwordHash`):

```json
{ "id": 2, "fullName": "Ananya Rao", "email": "customer@labelapsare.com", "mobile": "9876543210", "role": "CUSTOMER", "isActive": true, "createdAt": "2026-09-26T11:46:00.446Z" }
```

Field rules (shared with `/api/users`): `fullName` 2–100 chars; `email` is trimmed and **lowercased**; `mobile` is an Indian mobile, 10 digits starting 6–9 (no `+91`); `password` 8–72 chars with at least one letter and one number. Both `email` and `mobile` are required because both columns are `NOT NULL UNIQUE`.

Note: `sensitiveLimiter` is one counter shared by signup, forgot/reset password, `PATCH /users/me` and `POST /contact` (10 per 15 minutes per IP). `loginLimiter` is separate and counts only failed logins, so failed logins can't block signup or a password reset.

**POST `/signup`** → `201 { "user": User }` + session cookie

```json
{ "fullName": "Ananya Rao", "email": "ananya@example.com", "mobile": "9876543210", "password": "passw0rd1", "remember": false }
```

`remember` is optional (default `false`). Duplicate email or mobile → `409 { code: "CONFLICT", message: "An account with these details already exists" }`, with no `details`, so signup can't be used to find out which email or mobile is registered.

**POST `/login`** and **POST `/admin/login`** → `200 { "user": User }` + session cookie

```json
{ "identifier": "ananya@example.com", "password": "passw0rd1", "remember": true }
```

- `identifier` containing `@` is treated as an email (case-insensitive), otherwise as a mobile number.
- Unknown user, wrong password, or (on `/admin/login`) a non-admin → `401 { code: "INVALID_CREDENTIALS", message: "Invalid credentials" }`. It is always the same response and takes the same time (bcrypt runs against a dummy hash when the user doesn't exist).
- Correct password on a disabled account → `403 ACCOUNT_DISABLED`.
- `remember: true` gives a 30-day cookie; otherwise 7 days.

**POST `/logout`** → `200 { "ok": true }` and clears the cookie.

**GET `/me`** → `200 { "user": User }`, or `401 UNAUTHENTICATED`.

**POST `/forgot-password`** `{ "email": "ananya@example.com" }` → always `200 { "message": "If an account exists for that email, a reset link has been sent." }`. Unknown or disabled emails create no token and send nothing. Otherwise the link `${CLIENT_URL}/reset-password?token=<64 hex chars>` is emailed through the mailer (see [Email](#email); with the `console` provider it is logged outside production).

**POST `/reset-password`** → `200 { "message": "Password updated. Please log in with your new password." }` and clears any session cookie. It does not log the user in, and every existing session for that user is revoked.

```json
{ "token": "<64 hex chars from the link>", "password": "newpass123" }
```

The token is consumed atomically (single use), and every other outstanding reset token for that user is invalidated. An invalid, used or expired token → `400 INVALID_RESET_TOKEN`. A malformed token → `400 VALIDATION_ERROR` (`body.token`).

## Users: `/api/users`

All routes need a session (`auth: "user"`).

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/me/profile` | user | Profile → `{ "user": User }` |
| PATCH | `/me` | user, sensitiveLimiter | Update name, email, mobile |
| POST | `/me/change-password` | user · `sensitive` limiter | Change password (current + new) |

**PATCH `/me`** → `200 { "user": User }`. Send any subset, but at least one field (field rules as for signup):

```json
{ "fullName": "Ananya R", "email": "new@example.com", "mobile": "9876500001" }
```

An empty body → `400 VALIDATION_ERROR` (`path: "body"`). An email or mobile already used by another account → `409 CONFLICT` with `details[0].path` = `"email"` or `"mobile"`.

**POST `/me/change-password`** → `200 { "message": "Password updated" }`

```json
{ "currentPassword": "passw0rd1", "newPassword": "another123" }
```

- Wrong current password → `400 INVALID_PASSWORD` with `details: [{ path: "body.currentPassword" }]`. It is a 400, not a 401, so the client should not treat it as a logout.
- `newPassword` must follow the password rules and differ from `currentPassword`.
- Every existing session for the user (other devices included) is revoked, and the response sets a fresh session cookie (default 7-day expiry) so the caller stays logged in. Outstanding reset tokens are invalidated.

## Addresses: `/api/addresses`

All routes need a session and are scoped to the current user. Another user's address id returns `404 NOT_FOUND`, exactly like a missing one.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | user | `{ "items": Address[] }`, default first, then newest (not paginated) |
| POST | `/` | user | Create → `201 { "address": Address }`; the first address becomes the default |
| PATCH | `/:id` | user | Update → `{ "address": Address }` |
| DELETE | `/:id` | user | `204`; deleting the default promotes the newest remaining address |
| PATCH | `/:id/default` | user | Make this the default → `{ "address": Address }` |

`Address`:

```json
{ "id": 4, "fullName": "Ananya Rao", "mobile": "9876500000", "line1": "12 MG Road", "line2": null, "landmark": null, "city": "Bengaluru", "state": "Karnataka", "pincode": "560001", "isDefault": true, "createdAt": "…", "updatedAt": "…" }
```

**POST `/`** body. Required: `fullName` (≤ 100), `mobile` (exactly 10 digits), `line1` (≤ 191), `city`, `state` (≤ 100), `pincode` (exactly 6 digits). Optional: `line2`, `landmark` (`""` or `null` store `null`) and `isDefault` (boolean).

```json
{ "fullName": "Ananya Rao", "mobile": "9876500000", "line1": "12 MG Road", "line2": "Flat 3", "landmark": "Near metro", "city": "Bengaluru", "state": "Karnataka", "pincode": "560001", "isDefault": true }
```

**PATCH `/:id`** accepts any subset of the same fields, with at least one. Omitted fields are unchanged, and `null` or `""` clears `line2` or `landmark`. `isDefault: true` moves the default to this address. `isDefault: false` is ignored, because there must always be exactly one default: set another address as the default instead.

Exactly one default per user (once they have any addresses) is kept inside a transaction that locks the user's row, so concurrent requests can't create two defaults. A non-numeric `:id` → `400 VALIDATION_ERROR` (`params.id`).

## Categories: `/api/categories`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | public | Active category tree with product counts |
| GET | `/:slug` | public | One category with its breadcrumb and children |

Admin CRUD lives under `/api/admin/categories`. Both GETs send `Cache-Control: public, max-age=60, stale-while-revalidate=300`.

Only active categories are returned, and a category under an inactive parent is hidden too. `productCount` counts active products in the category **and all its descendants** (so "Sarees" includes Silk, Cotton, …).

```ts
type CategoryNode = Category & { productCount: number; children: CategoryNode[] }; // sorted by sortOrder, then name
type Crumb = { id: number; name: string; slug: string };
```

**GET `/`** → `200 CategoryNode[]` (roots only; children nested).

**GET `/:slug`** → `200 { category: Omit<CategoryNode, "children">, breadcrumb: Crumb[], children: CategoryNode[] }`. `breadcrumb` is root-first and ends with the category itself. Unknown or hidden slug → `404 NOT_FOUND`; malformed slug (anything but `a-z0-9-`) → `400 VALIDATION_ERROR`.

## Products: `/api/products`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | optional, searchLimiter (with `q`) | Search, filter, sort, paginate, with facet counts |
| GET | `/home` | public | Homepage banners and 6 product rails, in one call |
| GET | `/:slug` | optional | Full product detail |
| GET | `/:slug/similar` | public | Up to 8 `ProductSummary` from the same category |
| GET | `/:slug/reviews` | public | `Paginated<Review>`, newest first |
| POST | `/:slug/reviews` | user, reviewLimiter | Create my review (verified purchase only, one per product) |

**Visibility:** only *purchasable* products are ever returned: the product is active and its category **and every ancestor** is active (any depth; the same set as the public category tree). Anything else is a `404`. The one predicate is `purchasableProductWhere()` / `isPurchasable()` in `products.service.ts`, and cart, wishlist and order placement use it too. The pincode check lives at `GET /api/payments/pincode/:pincode`.

**Caching:** every GET sends `Cache-Control: public, max-age=60, stale-while-revalidate=300` and `Vary: Cookie, Authorization`. When `GET /` or `GET /:slug` is called with a valid session the body is personalised (`inWishlist`), so it is sent as `Cache-Control: private, no-store` instead.

### Shapes

```ts
// Listing card. Matches client ProductSummary. Only the first 2 images (by sortOrder) are sent.
interface ProductSummary {
  id: number; code: string; name: string; slug: string; brand: string;
  category: { name: string; slug: string };
  mrp: number; salePrice: number; discountPercent: number;
  images: { id: number; url: string; alt: string | null; sortOrder: number }[];
  sizes: string[];                                  // distinct, in variant order
  colors: { name: string; hex: string | null }[];   // distinct by name
  ratingAvg: number; ratingCount: number;
  isNewArrival: boolean; isTrending: boolean; isBestSeller: boolean; isDealOfDay: boolean;
  inStock: boolean;                                 // any variant has stock > 0
  inWishlist?: boolean;                             // only when logged in
}
```

### GET `/`

Query (all optional; unknown keys are ignored):

| Param | Type | Notes |
| --- | --- | --- |
| `page`, `limit` | int | 1+, 1–100 (default 1, 20) |
| `q` | string ≤ 100 | Normalised first (see Data formats). Search. 3+ chars: Postgres full-text search over `to_tsquery('english', ...)` against the `product_search_idx` GIN index; each word is required and prefix-matched (`silk sar` finds "Silk Saree"); operator characters and stopwords are dropped. Hyphenated words such as `APS-SAR-001` are matched via a product-code substring match instead of `to_tsquery`'s phrase syntax — see Data formats. A product-code substring (`SAR-00`) always matches too, and so does every product in a category whose name chain (the category and its ancestors) contains every word of `q` (`sarees` → all sarees, `silk sarees` → Sarees › Silk). Under 3 chars (or no indexable word): `contains` on name, brand, code, description, plus the category match. |
| `category` | slug | Includes descendant categories. Unknown slug → `404` |
| `fabric`, `occasion`, `size`, `color` | comma list | Exact values, e.g. `size=M,L`. Up to 20 values |
| `minPrice`, `maxPrice` | number | On `salePrice`. `minPrice > maxPrice` → `400` |
| `minDiscount` | int 0–100 | `discountPercent ≥` |
| `minRating` | number 0–5 | `ratingAvg ≥` |
| `inStock` | bool | `true/false/1/0/yes/no` |
| `isNew`, `trending`, `bestSeller`, `deal` | bool | `isNewArrival`, `isTrending`, `isBestSeller`, `isDealOfDay`; several flags are ANDed |
| `sort` | enum | `recommended` (default), `newest`, `price_asc`, `price_desc`, `discount`, `popularity` (soldCount), `rating` |

`size`, `color` and `inStock` must hold for the **same variant** (`size=M&color=Red&inStock=true` means "an M in Red that is in stock"). `recommended` with `q` orders by search relevance: code hits first, then the top 500 FULLTEXT hits by score, then every other match (deeper text hits, category-name hits) in plain `recommended` order. Without `q` it is trending, then soldCount, then rating. Every sort ends with an `id` tie-break, so pages are stable. `meta.total` and the facets always cover the **full** match set (no cap).

Response `200`:

```ts
Paginated<ProductSummary> & {
  facets: {
    categories: { slug: string; name: string; parentSlug: string | null; count: number }[]; // counts roll up to parents
    fabrics:    { value: string; count: number }[];                  // count desc
    occasions:  { value: string; count: number }[];
    sizes:      { value: string; count: number }[];                  // Free Size, XS…XXL, then numeric
    colors:     { value: string; hex: string | null; count: number }[];
    price:      { min: number | null; max: number | null };          // salePrice range
  };
}
```

Facets are computed on the filtered set, but each facet **ignores its own filter** (category, fabric, occasion, size, colour, price), so choosing `fabric=Silk` still lists the other fabrics with their counts. Counts are numbers of products. The size and colour facets scan at most 20,000 (product, value) rows, so on a very large match set their counts are a lower bound. Errors: `400 VALIDATION_ERROR` (`details[].path` like `query.sort`), `404` unknown category.

### GET `/home`

```ts
{
  banners: Banner[];
  newArrivals: ProductSummary[];  // isNewArrival, createdAt desc
  trending: ProductSummary[];     // isTrending, soldCount desc
  bestSellers: ProductSummary[];  // isBestSeller, soldCount desc
  deals: ProductSummary[];        // isDealOfDay, discountPercent desc
  topRated: ProductSummary[];     // ratingCount > 0, ratingAvg desc then ratingCount desc
  underPrice: ProductSummary[];   // salePrice ≤ underPriceLimit, soldCount desc
  underPriceLimit: number;        // 1999 (for the "Under ₹1,999" heading)
}
```

Banners are active ones sorted by `sortOrder`. Each rail holds up to 8 purchasable products and can be empty (e.g. `topRated` before any reviews exist); hide empty rails.

### GET `/:slug`

```ts
ProductSummary & {             // images: all of them, not just 2
  category: { id: number; name: string; slug: string };
  description: string; fabric: string | null; occasion: string | null; pattern: string | null;
  careInstructions: string | null; specs: Record<string, string> | null;
  variants: { id: number; sku: string; size: string; color: string; colorHex: string | null; stock: number }[];
  breadcrumb: { id: number; name: string; slug: string }[]; // root-first, ends at the product's category
  reviewSummary: { ratingAvg: number; ratingCount: number; distribution: { "1": number; "2": number; "3": number; "4": number; "5": number } };
  inWishlist?: boolean;        // only when logged in
}
```

`404` for an unknown, inactive or hidden product.

### GET `/:slug/similar`

`200 ProductSummary[]`: up to 8 others from the same category, best sellers first. `404` if the product is not visible.

### GET `/:slug/reviews`

`?page=&limit=` → `200 Paginated<Review>`, where `Review = { id, productId, rating, comment: string | null, createdAt, author: string }`. `author` is the reviewer's first name and last initial (`"Ananya R."`); user ids and full names are never exposed.

### POST `/:slug/reviews`

```json
{ "rating": 4, "comment": "Lovely drape" }
```

- `rating`: integer 1–5 (required). `comment`: optional, trimmed, 3–2000 chars.
- **Decision: verified purchase only.** The user needs an order with status `DELIVERED` that contains any variant of the product; otherwise `403 PURCHASE_REQUIRED`.
- One review per user per product: a second attempt → `409 ALREADY_REVIEWED` (a race falls through to the unique index → `409 CONFLICT`). Editing a review is not supported yet.
- `201` with the created `Review` (same shape). In the same transaction the product's `ratingCount` and `ratingAvg` (1 decimal) are recomputed from the `Review` table by `recomputeRating(tx, productId)` (`products.service.ts`), which the admin review delete uses too.

## Wishlist: `/api/wishlist`

All routes: **user**, sent with `Cache-Control: private, no-store`. Code: `client/src/server/modules/wishlist/` (`wishlist.schemas.ts`, `wishlist.service.ts`), routes in `client/src/app/api/wishlist/`.

| Method | Path | Body / query | Response |
| --- | --- | --- | --- |
| GET | `/` | `?page=&limit=` | `Paginated<WishlistProduct>` (newest first) |
| POST | `/` | `{ productId }` (JSON integer) | `201` when added, `200` when already there: `{ productId, inWishlist: true, added: boolean }`. `404` unless the product is purchasable (active, visible category) |
| DELETE | `/:productId` | | Idempotent: `{ productId, inWishlist: false, removed: boolean }` |
| POST | `/:productId/move-to-cart` | `{ variantId, quantity? = 1 (1–10) }` | `{ productId, inWishlist: false, cartItem: AddResult, notice: string \| null }`. `404` if the product is not in my wishlist, `400 VARIANT_MISMATCH` if the variant belongs to another product, `409 OUT_OF_STOCK`. Same merge/cap rules as `POST /api/cart` |

`WishlistProduct` = `ProductSummary & { addedAt: string }` (the same summary as the catalog, built by `summarySelect` / `toSummary` from `products.service.ts`; no `inWishlist`). Only purchasable products are listed: a product that is deactivated or whose category is hidden drops out of the list (and `meta.total`) and comes back if it is re-listed.

## Cart: `/api/cart`

All routes: **user**, always scoped to `ctx.user.id` (another user's `itemId` → `404`), sent with `Cache-Control: private, no-store`. Prices come from the DB only; the client never sends prices. Code: `client/src/server/modules/cart/` (`cart.schemas.ts`, `cart.service.ts`, `cart.pricing.ts`), routes in `client/src/app/api/cart/`.

| Method | Path | Body / query | Response |
| --- | --- | --- | --- |
| GET | `/` | `?coupon=CODE` (optional; counts toward `couponLimiter`) | `CartResponse`. An invalid coupon does **not** fail: `coupon: null` and `couponError` holds the reason. Lines whose stock fell below their quantity are clamped (see below) |
| POST | `/` | `{ variantId, quantity? = 1 (1–10) }` | `201` `CartResponse & { added: AddResult, notice }`. Merges with an existing line; caps at stock and at 10 per line (`notice` explains a cap). `404` unknown or non-purchasable product (inactive, or hidden category), `409 OUT_OF_STOCK` when stock is 0 |
| PATCH | `/:itemId` | `{ quantity (1–10) }` | `CartResponse & { notice }`; quantity capped at stock. `409 OUT_OF_STOCK` when stock is 0 |
| DELETE | `/:itemId` | | `CartResponse` |
| POST | `/:itemId/move-to-wishlist` | | `CartResponse` (the line is removed, the product upserted into the wishlist). `404` if the product is no longer purchasable (delete the line instead) |
| POST | `/merge` | `{ items: [{ variantId, quantity (1–100) }] }` (max 50 entries) | `CartResponse & { merged: { variantId, quantity, capped }[], skipped: { variantId, reason: "OUT_OF_STOCK" \| "NOT_FOUND" }[] }`. Call once after login with the localStorage cart, then clear it. Duplicate variants are summed; each line follows the add rules |
| DELETE | `/` | | Clears the cart → empty `CartResponse` |

```ts
AddResult = { variantId, quantity /* final line qty */, capped: boolean, requested: number }

CartResponse = {
  items: {
    id: number,                 // cart item id (use for PATCH/DELETE)
    quantity: number,
    available: boolean,         // issue === null
    issue: null | "INACTIVE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK", // INACTIVE = product inactive or category hidden
    maxQuantity: number,        // min(stock, 10); for the qty picker
    lineMrp: number,            // mrp × quantity
    lineTotal: number,          // salePrice × quantity
    variant: {
      id, sku, size, color, colorHex, stock,
      product: { id, code, name, slug, brand, mrp, salePrice, discountPercent, images: { id, url, alt }[] /* first only */ }
    }
  }[],                          // newest first
  itemCount: number,            // Σ quantity (all lines)
  hasUnavailableItems: boolean, // block checkout while true
  summary: CartSummary,         // computed over AVAILABLE lines only
  coupon: CouponPublic | null,
  couponError: string | null,
  adjustments: { itemId, variantId, from, to }[] // lines clamped to stock by THIS request (usually [])
}

CartSummary = {
  totalMrp,            // Σ mrp × qty
  discountOnMrp,       // totalMrp − subtotal
  subtotal,            // Σ salePrice × qty; coupons and free shipping are judged on this
  couponDiscount,
  deliveryCharge,      // StoreSetting.deliveryCharge, 0 when subtotal ≥ freeShippingThreshold (or cart empty)
  codFee?,             // only when priced with { cod: true } (checkout)
  total,               // subtotal − couponDiscount + deliveryCharge (+ codFee)
  freeShippingRemaining // how much more subtotal unlocks free delivery; 0 when free
}
```

**Stock fell below the quantity:** every call that returns a `CartResponse` (GET and the mutations) clamps a purchasable line with `0 < stock < quantity` down to `stock`, **saves** it, and reports it once in `adjustments` (e.g. `{ "itemId": 24, "variantId": 31, "from": 3, "to": 2 }`; show "Only 2 left, we updated your bag"). The line is then available again. A line with `stock = 0` is not changed: it stays in the cart with `issue: "OUT_OF_STOCK"` and blocks checkout. Placing an order never clamps: a shortfall at that moment is `409 OUT_OF_STOCK` (see Orders).

**Pricing module** (`client/src/server/modules/cart/cart.pricing.ts`, reused by orders): maths is done in integer paise; returned amounts are rupees rounded to 2 dp. Percent coupons floor to the paisa, are capped by `maxDiscount`, and never exceed the subtotal. Free shipping uses the pre-coupon subtotal.

- `computeCartSummary(items: { mrp, salePrice, quantity }[], settings: { deliveryCharge, freeShippingThreshold, codFee }, coupon?: { type, value, maxDiscount } | null, opts?: { cod?: boolean }): CartSummary`. Money inputs may be numbers, numeric strings or Prisma Decimals.
- `validateCoupon(code, subtotal, userId, tx?): Promise<Coupon>`: throws `400 COUPON_INVALID` (with `details[0].path = "code"`). Unknown, inactive, not-yet-started (`startsAt` in the future) and expired (`expiresAt ≤ now`) codes all get the same message, `"Invalid or expired coupon"` (`INVALID_COUPON`), so codes cannot be probed. These keep specific messages: usage limit reached, `"Coupon X is only valid on your first order"` (`firstOrderOnly` and the user has any non-cancelled order), `"You have already used coupon X the maximum number of times"` (the user's non-cancelled orders with this coupon ≥ `perUserLimit`) and minimum order not met ("Add items worth ₹X more…"). Cancelled orders never count, so cancelling gives the coupon back. The code is trimmed and upper-cased.
- `getStoreSettings(tx?)`, `computeCouponDiscount(coupon, subtotal)`, `toPaise`, `toRupees`, and the shared `Tx` (interactive transaction client) / `Db` (`Tx` or the root client) type aliases.
- `cart.service.ts` exports `loadCart(userId, couponCode?, tx?)` (the `CartResponse` above), `addToCart(userId, variantId, qty, tx?, visibleCategoryIds?)` and `MAX_QTY_PER_LINE = 10` (defined in `cart.schemas.ts`).

## Coupons: `/api/coupons`

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| GET | `/available` | optional | | `Cache-Control: private, no-store`. `{ items: CouponPublic[], subtotal: number \| null }`: active, started, unexpired, not used up, with a description; sorted by `minOrderAmount`. When signed in, coupons I can no longer use are left out (first-order-only once I have an order, per-customer limit reached), each item also has `eligible: boolean`, `amountNeeded: number`, `discount: number` against my current cart, and `subtotal` is my cart subtotal |
| POST | `/apply` | user, couponLimiter | `{ code, subtotal? }` | `{ coupon: CouponPublic, discount: number, summary: CartSummary }`. `subtotal` is ignored: the server uses my current cart's subtotal. `400 COUPON_INVALID` with the reason: `"Invalid or expired coupon"` for unknown/inactive/not-started/expired codes, otherwise the minimum-order, usage-limit, first-order-only, per-customer-limit or "Your bag is empty" message |

```ts
CouponPublic = { code, description, type: "PERCENT" | "FLAT", value, maxDiscount: number | null, minOrderAmount, expiresAt: string | null, firstOrderOnly: boolean }
```

Code: `client/src/server/modules/coupons/` (`coupons.schemas.ts`, `coupons.service.ts`), routes in `client/src/app/api/coupons/`. Applying is a preview only; nothing is stored. The client keeps the chosen code and sends it as `GET /api/cart?coupon=` and to order placement, which re-validates it. Admin CRUD lives under `/api/admin/coupons`.

## Orders: `/api/orders`

All routes are **user** (`auth: "user"`). Code: `client/src/server/modules/orders/` (`orders.schemas.ts`, `orders.service.ts`, `orders.status.ts`), routes in `client/src/app/api/orders/`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | user, orderLimiter | Place an order from my cart |
| GET | `/` | user | `Paginated<OrderListItem>` (mine, newest first) |
| GET | `/:orderNumber` | user | `OrderDetail` (items, status timeline, payments) |
| POST | `/:orderNumber/cancel` | user, cancelLimiter | Cancel while PLACED or CONFIRMED (restocks) |

### `POST /api/orders`

Body: `{ "addressId": 12, "paymentMethod": "COD" | "UPI" | "CARD" | "NET_BANKING", "couponCode"?: "WELCOME10" }` (`addressId` a JSON integer). Optional header `Idempotency-Key: <8–128 chars>` (a UUID per checkout attempt).

One interactive transaction; any failure rolls everything back:

0. My `User` row is locked (`SELECT … FOR UPDATE`), which serialises my concurrent checkouts (idempotency key, per-customer coupon rules). A deactivated account gets `401` from the session check; one disabled while the request was in flight gets **403 `ACCOUNT_DISABLED`**. A used `Idempotency-Key` returns the existing order here (see Idempotency).
1. The address must belong to me (else 404) and its pincode must be in `ServiceablePincode` (400 `PINCODE_NOT_SERVICEABLE`); COD also needs `codAvailable` (400 `COD_NOT_AVAILABLE`).
2. The cart is loaded and **re-priced from the DB** with `computeCartSummary` from `cart/cart.pricing.ts`. Empty cart → 400 `CART_EMPTY`.
3. Every line must still be purchasable (`isPurchasable`: product active, category and ancestors active). Otherwise → **409 `PRODUCT_UNAVAILABLE`**, with one `details` entry per such item: `{ "path": "variant.<variantId>", "message": "<name> (<size>, <colour>) is no longer available" }`. Nothing is reserved.
4. Stock is reserved per variant with a conditional `updateMany … where stock >= qty` (no overselling under concurrency). Any shortfall → **409 `OUT_OF_STOCK`**, with one `details` entry per item: `{ "path": "variant.<variantId>", "message": "<name> (<size>, <colour>): only 2 left" | "... is out of stock" }`.
5. `couponCode` (case-insensitive) is checked with `validateCoupon` (400 `COUPON_INVALID`, including the first-order-only and per-customer rules) and its `usedCount` incremented conditionally (never past `usageLimit`).
6. The order is created with address and item snapshots (name, code, first image, size, colour, MRP, sale price), a `PLACED` history entry and a `Payment` row from the provider. `soldCount` is incremented and the cart is cleared. The address is copied, not referenced: editing or deleting it later never changes the order.
7. After commit, an order-confirmation email is queued (non-blocking; see [Email](#email)).

Money: `totalMrp` = Σ MRP × qty, `totalDiscount` = discount on MRP, `couponDiscount`, `deliveryCharge` (from `StoreSetting`, 0 at/above the free-shipping threshold, **plus `codFee` for COD**, since there is no separate column), `finalAmount` = subtotal − coupon + delivery.

`orderNumber` is `APS-YYMMDD-XXXXX` (IST date + 5 random chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`), retried on collision. Path lookups are case-insensitive.

Payment methods: only **COD** is live. `UPI` / `CARD` / `NET_BANKING` → 400 `PAYMENT_METHOD_UNAVAILABLE` until a gateway that supports them is registered (see Payments).

Idempotency: the key is stored on the order (`Order.idempotencyKey` = `<userId>:<key>`, unique; never returned by the API), so it survives restarts and works across server instances, with no expiry. A repeat request with the same key from the same user returns the original order with **200** and `"replayed": true` instead of placing another (the body of the repeat is not compared). Concurrent requests with one key produce exactly one order: they queue on the user lock and the later ones replay it, and a unique-index race (P2002) also resolves to the existing order. A failed attempt stores nothing, so it can be retried with the same key. The same key from another user is unrelated. Without a key, a double submit fails with `CART_EMPTY` because the first order cleared the cart.

Response **201**: `OrderDetail` (below) plus `"replayed": false` when a key was sent.

Errors: 400 `VALIDATION_ERROR` / `CART_EMPTY` / `PINCODE_NOT_SERVICEABLE` / `COD_NOT_AVAILABLE` / `COUPON_INVALID` / `PAYMENT_METHOD_UNAVAILABLE`, 403 `ACCOUNT_DISABLED`, 404 address, 409 `PRODUCT_UNAVAILABLE` / `OUT_OF_STOCK`, 429 `RATE_LIMITED`.

### `OrderDetail` (POST `/`, GET `/:orderNumber`, POST `/:orderNumber/cancel`)

```json
{
  "id": 1, "orderNumber": "APS-260926-DFDBY", "userId": 2,
  "status": "PLACED", "paymentMethod": "COD", "paymentStatus": "PENDING",
  "totalMrp": 37998, "totalDiscount": 8000, "couponId": 1, "couponDiscount": 500,
  "deliveryCharge": 0, "finalAmount": 29498,
  "shipName": "Test Buyer", "shipMobile": "9876543210", "shipLine1": "1 Test St", "shipLine2": null,
  "shipLandmark": null, "shipCity": "Bengaluru", "shipState": "Karnataka", "shipPincode": "560038",
  "createdAt": "2026-09-26T11:54:15.469Z", "updatedAt": "2026-09-26T11:54:15.469Z",
  "items": [{
    "id": 1, "orderId": 1, "variantId": 1, "productName": "Kanjivaram Silk Saree with Temple Border",
    "productCode": "APS-SAR-001", "imageUrl": "/images/products/saree-03.jpg",
    "size": "Free Size", "color": "Maroon", "mrp": 18999, "salePrice": 14999, "quantity": 2
  }],
  "statusHistory": [{ "id": 1, "orderId": 1, "status": "PLACED", "note": "Order placed", "createdAt": "..." }],
  "payments": [{ "id": 1, "provider": "cod", "providerRef": null, "amount": 29498, "status": "PENDING", "createdAt": "..." }],
  "coupon": { "code": "WELCOME10" }
}
```

`statusHistory` is oldest first (the timeline); `coupon` is `null` when none was used. Another user's order is a **404**, not a 403.

### `GET /api/orders`

Query: `page`, `limit`, `status?` (`PLACED` | `CONFIRMED` | `PACKED` | `SHIPPED` | `OUT_FOR_DELIVERY` | `DELIVERED` | `CANCELLED`). Returns `Paginated<OrderListItem>`:

```json
{
  "items": [{
    "id": 1, "orderNumber": "APS-260926-DFDBY", "status": "PLACED", "paymentMethod": "COD",
    "paymentStatus": "PENDING", "finalAmount": 29498, "createdAt": "...", "updatedAt": "...",
    "itemCount": 2,
    "items": [{ "id": 1, "productName": "...", "imageUrl": "/images/...", "size": "Free Size", "color": "Maroon", "quantity": 2 }]
  }],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1, "hasNext": false }
}
```

`itemCount` is the total quantity.

### `POST /api/orders/:orderNumber/cancel`

Body: `{ "reason"?: string (≤ 500) }`. Only while `PLACED` or `CONFIRMED`, else 409 `ORDER_NOT_CANCELLABLE` (also returned for a second cancel). The work is done by `cancelOrderTx(tx, order, { note, actor })` in `orders.service.ts`, which the admin status update uses too. In one transaction it sets the status to `CANCELLED` (claimed with a conditional update, so concurrent cancels cannot double-restock), restocks every variant that still exists, decrements `soldCount`, releases the coupon use, sets payments `PAID → REFUNDED` / `PENDING → FAILED` (and `Order.paymentStatus` to match) and appends a `CANCELLED` history entry with the note `Cancelled by customer: <reason>`. Returns `OrderDetail`. A cancellation email is queued after commit.

### Status transitions (`orders.status.ts`)

`PLACED → CONFIRMED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`, and `CANCELLED` from `PLACED` / `CONFIRMED` only. `DELIVERED` and `CANCELLED` are final. Exports `ORDER_TRANSITIONS`, `CANCELLABLE_STATUSES`, `canTransition(from, to)` and `assertTransition(from, to)`, which throws 409 `INVALID_STATUS_TRANSITION`. Admin status updates should use these too.

## Payments: `/api/payments`

Code: `client/src/server/modules/payments/` (`payments.schemas.ts`, `payments.service.ts`, `provider.ts`, `pincode.ts`), routes in `client/src/app/api/payments/`. `pincode.ts` exports `pincodeSchema` (6 digits, first digit 1–9), the one pincode rule, also used by admin settings. `PaymentMethod` is the Prisma enum type.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/pincode/:pincode` | public | Delivery serviceability, COD and ETA |
| GET | `/methods` | public | Payment methods the checkout can offer now |
| POST | `/verify` | user | Verify a gateway checkout and mark it PAID (stub; 501 for cod) |
| POST | `/webhook/:provider` | public (signature-checked) | *Planned*, not mounted yet |

The `Payment` row is created during `POST /api/orders`, so there is no separate `/:orderNumber/create` endpoint. When a gateway arrives, its `clientPayload` will be returned from order placement.

### `GET /api/payments/pincode/:pincode`

This is the only pincode-check endpoint (the old `/api/products/pincode/:pincode` was removed). `pincode` must match `pincodeSchema` (`^[1-9]\d{5}$`, else 400). Always 200:

```json
{ "pincode": "560038", "serviceable": true, "codAvailable": true, "deliveryDays": 2, "estimatedDelivery": "2026-09-28" }
{ "pincode": "999999", "serviceable": false, "codAvailable": false, "deliveryDays": null, "estimatedDelivery": null }
```

`estimatedDelivery` is today (UTC) + `deliveryDays`, as `YYYY-MM-DD`.

### `GET /api/payments/methods`

`{ "provider": "cod", "methods": ["COD"] }`

### `POST /api/payments/verify`

Body: `{ "orderNumber": string, "provider"?: string, "payload": { ...gateway callback fields } }`. With the cod provider (the only one today) → **501** `NOT_IMPLEMENTED`. Unknown provider → 400 `UNKNOWN_PROVIDER`. For a real gateway: the order must be mine (404), `provider.verifyPayment(payload)` checks the signature (400 `PAYMENT_VERIFICATION_FAILED`), then the latest payment and the order are marked `PAID` → `{ "orderNumber", "paymentStatus": "PAID" }`.

### Providers

`provider.ts` holds the `PaymentProvider` interface (`name`, `methods`, `supportsVerify`, `createPayment`, `verifyPayment`) and a registry keyed by name, selected by `PAYMENT_PROVIDER` (`env.paymentProvider`, default `cod`). Helpers: `getProvider(name)`, `activeProvider()`, `providerForMethod(method)` (COD always uses `cod`; other methods need the active provider to list them) and `availableMethods()`. To add Razorpay, implement the interface, register it and set `PAYMENT_PROVIDER=razorpay`. The webhook route must be mounted before `requireAuth` and use `express.raw()` so the signature can be HMAC-checked against the raw body (see the comment in `payments.routes.ts`).

## Uploads: `/api/uploads`

Admin only (`auth: "admin"`), with `uploadLimiter` (60 requests per 10 minutes per admin).

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/image` | Upload 1–10 images |
| DELETE | `/image` | Delete one uploaded image |

**`POST /image`**: `multipart/form-data`, field **`files`** (repeat it for several files).

- Up to 10 files, each ≤ 5 MB. Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- The declared mimetype **and** the file's magic bytes must match an allowed type, so a renamed `.txt` is rejected. All files are checked before any is stored.
- Storage: with `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` set, files are streamed to Cloudinary folder `apsare/products`. Without them (dev), files go to `client/public/uploads/<uuid>.<ext>` and are served by Next.js at `/uploads/<uuid>.<ext>`. The client's filename is never used.

`201`:

```json
{ "items": [{ "url": "https://res.cloudinary.com/.../apsare/products/abc.jpg", "publicId": "apsare/products/abc", "format": "jpeg", "bytes": 397201, "width": 1200, "height": 1600 }] }
```

Dev-local items have `"url": "/uploads/<uuid>.jpg"`, `"publicId": null` and no `width`/`height`. Pass `url` and `publicId` into the product `images[]` body.

Errors: `400` no files, a wrong field name or more than 10 files; `413 PAYLOAD_TOO_LARGE` for a file over 5 MB; `415 UNSUPPORTED_MEDIA_TYPE` for a mimetype or content that is not an allowed image (`details[].path = "files.<i>"`).

**`DELETE /image`** body `{ "publicId": "apsare/products/abc" }` or `{ "url": "..." }` → `204`.

- Only accepts Cloudinary ids inside `apsare/products/` (or a Cloudinary URL for one), or local `/uploads/<uuid>.<ext>` URLs. Anything else gives `400`. Path traversal is impossible.
- `404` if the image is already gone. `503 UPLOADS_UNAVAILABLE` for a Cloudinary id when Cloudinary is not configured.
- Deleting or replacing a product does **not** delete its images from storage. Call this endpoint when the admin removes an image in the form.

## Admin: `/api/admin`

All routes use `auth: "admin"` (anonymous → 401, customer → 403, including unknown `/api/admin/*` paths), then `adminLimiter` on writes (300 per 5 minutes per admin). Code lives in `client/src/server/modules/admin/admin.<area>.{schemas,service}.ts`, with routes under `client/src/app/api/admin/**` built with `adminRoute()` / `adminMethods()` (`admin.route.ts`).

Shared rules:

- **Lists** return `Paginated<T>` and take `page`/`limit` plus the filters shown. `sort` is a whitelisted `field_dir` value; anything else gives `400`. Boolean query params accept only `true`/`false`. `q` is normalised (see Data formats) and does a case-insensitive `contains` match in which `%` and `_` are literal. The only unpaginated admin responses are `GET /categories/tree` (the whole category table), `PUT /banners/reorder` (all banners) and the CSV export.
- **URLs** stored by the admin (`imageUrl`, `ctaHref`, `images[].url`) must be an `http(s)://` URL or a site path starting with a single `/`. `javascript:`, `data:`, `//host` and anything containing a backslash (`/\host`) are rejected.
- **Audit log**: every `POST`/`PUT`/`PATCH`/`DELETE` under `/api/admin` is recorded in `AdminAuditLog` after the response is sent (admin, method, path without query string, status, target id, IP). Bodies are never stored. Recording is non-blocking: a failed insert is logged and never affects the response. See [Audit log](#audit-log).
- **Money** is a number with at most 2 decimals.
- A `404` is returned for an unknown `:id`.

### Dashboard

**`GET /dashboard`** → `AdminDashboardStats` (matches `client/src/types`):

```json
{
  "totals": { "products": 24, "orders": 2, "customers": 1, "sales": 2998 },
  "todayOrders": 2,
  "pendingOrders": 0,
  "lowStock": [{ "variantId": 23, "sku": "APS-BLS-001-44-GOLD", "size": "44", "color": "Gold", "stock": 1, "product": { "id": 14, "name": "…", "slug": "…" } }],
  "outOfStock": [],
  "salesOverTime": [{ "date": "2026-09-26", "sales": 2998, "orders": 1 }],
  "ordersByStatus": [{ "status": "PLACED", "count": 0 }],
  "recentOrders": [{ "id": 5, "orderNumber": "APS-260926-VQY6Y", "status": "CANCELLED", "finalAmount": 1598, "createdAt": "…" }]
}
```

- `totals.products` counts all products (active and inactive). `totals.customers` counts `role = CUSTOMER`. `totals.sales` is the sum of `finalAmount` over non-cancelled orders.
- Days are store days in **IST (+05:30)**: `todayOrders` counts orders since 00:00 IST, and `salesOverTime` has exactly 30 entries (oldest first, days with no orders are filled with 0) counting non-cancelled orders only.
- `pendingOrders` counts orders in `PLACED`, `CONFIRMED` or `PACKED` (not yet shipped).
- `lowStock` holds variants with `1 ≤ stock ≤ 5` and `outOfStock` holds variants with `stock ≤ 0`. Both are limited to 10 and to active products.
- `ordersByStatus` always lists all 7 statuses in enum order. `recentOrders` holds the latest 5.

### Products

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/products` | List |
| POST | `/products` | Create → `201` detail |
| GET | `/products/:id` | Detail |
| PATCH | `/products/:id` | Partial update → detail |
| PATCH | `/products/:id/status` | `{ isActive }` → `{ id, isActive }` |
| DELETE | `/products/:id` | → `{ id, deleted: "hard" \| "soft" }` |
| POST | `/products/bulk` | Bulk activate / deactivate / delete |

**Active products must be sellable:** an active product needs at least one variant **and** one image. Otherwise → `400 PRODUCT_INCOMPLETE`, message "An active product needs at least one variant and one image", with a `details` entry per missing part (`{ path: "body.variants" | "body.images", message }`). Checked on create (`isActive` defaults to `true`, so send `"isActive": false` to save a draft without images/variants), on PATCH (against the final state, so removing the last image or variant of an active product is refused too), on `PATCH /:id/status { isActive: true }` and on bulk `activate` (see below). Deactivating is always allowed.

Code: `admin.products.ts` (routes), `admin.products.schemas.ts` (Zod), `admin.products.service.ts` (Prisma).

**List query**: `q` (name or code), `categoryId`, `isActive`, `stock` (`in` = some variant has stock; `low` = in stock but some variant ≤ 5; `out` = no variant has stock), `isNewArrival`, `isTrending`, `isBestSeller`, `isDealOfDay`, `sort` (`createdAt_desc` default, `createdAt_asc`, `updatedAt_desc`, `name_asc`, `name_desc`, `salePrice_asc`, `salePrice_desc`, `discountPercent_desc`, `soldCount_desc`; every value is tested, each ends with an `id desc` tie-break).

List item:

```json
{ "id": 17, "code": "APS-LHG-001", "name": "…", "slug": "…", "brand": "Label Apsáre", "mrp": 64999, "salePrice": 52999, "discountPercent": 18,
  "isActive": true, "isNewArrival": false, "isTrending": false, "isBestSeller": true, "isDealOfDay": false, "soldCount": 17, "createdAt": "…", "updatedAt": "…",
  "category": { "id": 7, "name": "Lehengas", "slug": "lehengas" }, "image": { "id": 141, "url": "…", "alt": "…" } | null,
  "variantCount": 5, "totalStock": 6, "stockState": "in" | "low" | "out" }
```

**Detail** (`GET /:id`, and returned by create/update): every `Product` column plus `category { id, name, slug }`, `images[]` (`id, productId, url, publicId, alt, sortOrder`, sorted) and `variants[]` (`id, productId, sku, size, color, colorHex, stock`).

**Create body** (PATCH takes the same fields, all optional):

```json
{
  "code": "APS-SAR-099", "name": "Kanjivaram Silk Saree", "description": "…", "categoryId": 2,
  "brand": "Label Apsáre", "fabric": "Silk", "occasion": "Wedding", "pattern": "Zari", "careInstructions": "Dry clean",
  "specs": { "Saree length": "5.5 m", "Blouse piece": "Yes" },
  "mrp": 2499, "salePrice": 1499,
  "isActive": true, "isNewArrival": false, "isTrending": false, "isBestSeller": false, "isDealOfDay": false,
  "images": [{ "url": "/uploads/….jpg", "publicId": null, "alt": "Front", "sortOrder": 0 }],
  "variants": [{ "id": 12, "sku": "APS-SAR-099-FS-RED", "size": "Free Size", "color": "Red", "colorHex": "#B22222", "stock": 5 }]
}
```

- `discountPercent` is always computed from `mrp` and `salePrice` (`utils/pricing.ts`). If sent, it is ignored. `salePrice ≤ mrp` is enforced, and on PATCH it is checked against the stored value of whichever field is omitted.
- `slug` is generated from `name` and made unique (`-2`, `-3`…). On PATCH it only changes when the name changes.
- `specs`: at most 30 entries, keys 1–60 chars, values ≤ 500 chars. `null` clears it.
- `images` (≤ 15): when sent, **replaces** the whole list (`sortOrder` defaults to the array index). Omit it to leave images alone.
- `variants` (≤ 200): when sent, it is synced in one transaction with the product row. Variants with `id` (or, without `id`, a `sku` matching an existing variant of this product) are updated, new ones are created, and ones left out are deleted. `id` must belong to this product (400). SKUs and size+colour pairs must be unique within the body (400).
- A left-out variant that appears in any order cannot be deleted: `409` "set its stock to 0 instead".
- A duplicate `code` or `sku` gives `409 CONFLICT` with `details[0].path` `"code"` / `"sku"`. An unknown `categoryId` gives 400.

**Delete** (`DELETE /:id` and bulk `delete`): products referenced by any order item are **soft-deleted** (`isActive = false`) so order history stays intact. All others are **hard-deleted** (cascades to images, variants, reviews, wishlist and cart items).

**`POST /products/bulk`** `{ "ids": [1, 2], "action": "activate" | "deactivate" | "delete" }` (1–100 ids):

- deactivate → `{ action, requested, affected }`
- activate → `{ action, requested, affected, skipped: { id, reason: "NO_VARIANTS" | "NO_IMAGES" }[] }`: sellable products are activated, the others are left unchanged and listed in `skipped` (200, not an error)
- delete → `{ action, requested, affected, hardDeleted: number[], softDeleted: number[] }` (unknown ids are ignored)

### Categories

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/categories` | List |
| GET | `/categories/tree` | The **whole** tree, inactive categories included (not paginated) |
| POST | `/categories` | Create → `201` |
| GET | `/categories/:id` | Detail, plus `children[] { id, name, slug, isActive }` |
| PATCH | `/categories/:id` | Partial update |
| DELETE | `/categories/:id` | `204` |

List query: `q` (name/slug), `parentId` (a number, or `null` for top level), `isActive`, `sort` (`sortOrder_asc` default, `name_asc`, `name_desc`, `createdAt_desc`, `createdAt_asc`).

Item: `{ id, name, slug, description, parentId, imageUrl, sortOrder, isActive, createdAt, parent: { id, name, slug } | null, _count: { products, children } }`.

Body: `{ name, slug?, description?, parentId?: number | null, imageUrl?, sortOrder?, isActive? }`.

- `slug` defaults to a unique slug generated from `name`. An explicit duplicate gives `409` (path `slug`).
- Setting `parentId` to the category itself or one of its descendants gives `409 CATEGORY_CYCLE`. An unknown parent gives 400.
- Delete with products or subcategories gives `409 CATEGORY_IN_USE`.
- **Slug changes**: renaming never changes the slug (links stay stable); only an explicit `slug` does. Old `/category/<old-slug>` URLs then 404 (no redirect is stored), and in the same transaction every banner `ctaHref` pointing at `/category/<old-slug>` (optionally followed by `/…`, `?…` or `#…`) is rewritten to the new slug. Products and orders are unaffected (products link by their own slug; order items are snapshots).

**`GET /categories/tree`** → `CategoryTreeNode[]` (roots), where `CategoryTreeNode` = the list item (`{ id, name, slug, description, parentId, imageUrl, sortOrder, isActive, createdAt, parent, _count: { products, children } }`) plus `children: CategoryTreeNode[]`, sorted by `sortOrder`, then name. `_count.products` counts the category's own products (active and inactive). Use it for tree views and parent pickers; the public tree (`GET /api/categories`) hides inactive branches.

### Orders

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/orders` | List |
| GET | `/orders/export.csv` | CSV download of every order matching the list filters (streamed, not paginated) |
| GET | `/orders/:orderNumber` | Detail |
| PATCH | `/orders/:orderNumber/status` | `{ status, note? }` → detail |

List query: `q` (order number, customer name/email/mobile, or ship name), `userId` (one customer's orders: use it for the paginated order history on the customer page), `status`, `paymentMethod`, `paymentStatus`, `from`, `to` (ISO date or datetime, UTC; a bare `to` date includes the whole day; `to < from` gives 400), `sort` (`createdAt_desc` default, `createdAt_asc`, `finalAmount_desc`, `finalAmount_asc`).

List item: `{ id, orderNumber, status, paymentMethod, paymentStatus, finalAmount, shipName, shipCity, shipPincode, createdAt, updatedAt, user: { id, fullName, email, mobile }, _count: { items } }`.

Detail: every `Order` column (except `idempotencyKey`) plus `items[]`, `statusHistory[]` (oldest first, the timeline), `payments[]`, `coupon: { code } | null`, `user { id, fullName, email, mobile }` and **`nextStatuses: OrderStatus[]`**, the statuses the order can move to now (from `ORDER_TRANSITIONS`; `[]` when final). Returned by `PATCH …/status` too.

**`GET /orders/export.csv`**: the same query params as the list (`q`, `userId`, `status`, `paymentMethod`, `paymentStatus`, `from`, `to`, `sort`); `page`/`limit` are ignored. `200` with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="orders-YYYY-MM-DD.csv"`, streamed in batches of 500 rows. UTF-8 with a BOM (for Excel), CRLF line ends, one row per order:

```
orderNumber,createdAt,status,paymentMethod,paymentStatus,customerName,customerEmail,customerMobile,items,totalMrp,totalDiscount,coupon,couponDiscount,deliveryCharge,finalAmount,shipName,shipMobile,shipCity,shipState,shipPincode
```

`items` is the total quantity; dates are ISO 8601 UTC; money is plain numbers. Formula-injection safe: a text cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`, and cells with a comma, quote or line break are quoted (`"` doubled). Invalid filters are a normal JSON `400` (nothing streamed). Not counted by `adminLimiter`.

**Status update**: transitions follow `ORDER_TRANSITIONS` in `orders/orders.status.ts`:

```
PLACED → CONFIRMED | CANCELLED
CONFIRMED → PACKED | CANCELLED
PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
```

- An invalid transition gives **`409 INVALID_STATUS_TRANSITION`**. An unknown status value gives 400.
- Every change appends an `OrderStatusHistory` row with `note`.
- `CANCELLED` (one transaction, via the shared `cancelOrderTx`): restocks every item whose variant still exists, reverses `soldCount` and coupon `usedCount`, sets payments PAID→REFUNDED and PENDING→FAILED, and sets the order `paymentStatus` to REFUNDED if it was paid, otherwise FAILED. This matches the customer cancel.
- `DELIVERED` on a COD order sets the order `paymentStatus` and its pending payments to `PAID`.
- The update is a conditional claim on the current status, so a concurrent change gives 409 instead of a double restock.
- After commit, a status email (`"Your order APS-… is shipped"`, with the note) is queued for the customer (non-blocking).

### Customers

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/customers` | List |
| GET | `/customers/:id` | Detail |
| PATCH | `/customers/:id/status` | `{ isActive }` → `{ id, isActive }` |
| PATCH | `/customers/:id/role` | `{ role: "CUSTOMER" \| "ADMIN" }` → `{ id, role, isActive }` |

List query: `q` (name, email or mobile), `isActive`, `role` (default `CUSTOMER`), `sort` (`createdAt_desc` default, `createdAt_asc`, `fullName_asc`, `fullName_desc`, `orders_desc`).

Item: `{ id, fullName, email, mobile, role, isActive, createdAt, orderCount, totalSpent }`. `orderCount` counts all orders. `totalSpent` sums `finalAmount` of non-cancelled orders and is computed with one `groupBy` per page (no N+1).

Detail: the item fields plus `updatedAt`, `addresses[]`, `stats` and `recentOrders[]` (latest 10: `{ id, orderNumber, status, paymentMethod, paymentStatus, finalAmount, createdAt, _count: { items } }`; for the full, paginated history use `GET /orders?userId=<id>`). `passwordHash` is never returned.

```ts
stats: {
  orders: number;            // non-cancelled orders
  cancelledOrders: number;
  totalSpent: number;        // Σ finalAmount of non-cancelled orders (same as the top-level totalSpent)
  averageOrderValue: number; // totalSpent / orders, 2 dp; 0 with no orders
  firstOrderAt: string | null; lastOrderAt: string | null; // non-cancelled orders
}
```

Status and role:

- Deactivating yourself → `400 SELF_DEACTIVATION`; changing your own role → `400 SELF_ROLE_CHANGE`.
- Both changes run in a transaction that locks every active admin row: the acting admin must still be an active admin (else `403`), and at least one active admin must remain (`409 LAST_ADMIN`, a backstop). Together this means two admins demoting or disabling each other at the same moment can never leave the store with no admin: one wins, the other gets `403`.
- A deactivated user's session, or a demoted admin's access to `/api/admin`, stops working on the next request (the role and flag are read from the DB per request). Users cannot be deleted through the API (orders keep a reference).

### Coupons

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/coupons` | List |
| POST | `/coupons` | Create → `201` |
| GET | `/coupons/:id` | Detail |
| PATCH | `/coupons/:id` | Partial update |
| DELETE | `/coupons/:id` | `204` |

List query: `q` (code/description), `type`, `isActive`, `state` (`live` = active, `startsAt` null or ≤ now and `expiresAt` null or > now; `scheduled` = `startsAt` > now; `expired` = `expiresAt` ≤ now; the same boundaries as `validateCoupon`), `sort` (`createdAt_desc` default, `createdAt_asc`, `code_asc`, `expiresAt_asc`, `usedCount_desc`). Items are `Coupon` plus `_count: { orders }`.

Body: `{ code, description?, type: "PERCENT" | "FLAT", value, maxDiscount?, minOrderAmount?, usageLimit?, perUserLimit?, firstOrderOnly?, startsAt?, expiresAt?, isActive? }`. Responses include every column, so items and detail also carry `perUserLimit: number | null` and `firstOrderOnly: boolean`.

- `usageLimit` (1–10,000,000 or `null`) caps total uses; `perUserLimit` (1–1000 or `null`) caps one customer's non-cancelled orders with the coupon; `firstOrderOnly` (default `false`) only lets customers with no non-cancelled order use it. Both are enforced by `validateCoupon` at cart preview, apply and order placement.

- `code` is trimmed and upper-cased and must be 3–30 characters from `A–Z 0–9 _ -`. A duplicate gives `409` (path `code`).
- `value > 0`. PERCENT must be ≤ 90 and FLAT ≤ 100000. `maxDiscount` is only allowed for PERCENT (send `null` when switching to FLAT).
- `startsAt < expiresAt` when both are set. On PATCH, these rules apply to the merged (stored + incoming) values.
- Deleting a coupon that has been used on orders gives `409 COUPON_IN_USE` (deactivate it instead).

### Banners

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/banners` | List (`q` title, `isActive`, `sort`: `sortOrder_asc` default, `createdAt_desc`, `title_asc`) |
| POST | `/banners` | Create → `201`. Without `sortOrder` it goes last |
| PUT | `/banners/reorder` | `{ ids: number[] }` → `{ items: Banner[] }` (all banners, new order) |
| GET | `/banners/:id` | Detail |
| PATCH | `/banners/:id` | Partial update |
| DELETE | `/banners/:id` | `204` |

Body: `{ title, subtitle?, imageUrl, ctaLabel?, ctaHref?, sortOrder?, isActive? }`.

Reorder: the listed ids get `sortOrder` 0…n-1, and banners not listed follow in their current order. An unknown id gives 400.

### Settings & pincodes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/settings` | `{ deliveryCharge, freeShippingThreshold, codFee, updatedAt }` (creates row id=1 with defaults if missing) |
| PUT | `/settings` | Full body `{ deliveryCharge, freeShippingThreshold, codFee }` → same shape |
| GET | `/settings/pincodes` | List: `q` (pincode prefix, digits), `codAvailable`, `sort` (`pincode_asc` default, `pincode_desc`, `deliveryDays_asc`) |
| POST | `/settings/pincodes` | `{ pincode, deliveryDays?: 1–30 (default 5), codAvailable?: true }` → `201`. Already listed gives `409` (path `pincode`) |
| POST | `/settings/pincodes/bulk` | `{ pincodes: [{ pincode, deliveryDays?, codAvailable? }] }` (≤ 1000) → `201 { received, added, skipped }`. Existing pincodes and repeats are skipped, not updated |
| PATCH | `/settings/pincodes/:pincode` | `{ deliveryDays?, codAvailable? }` (at least one) → the updated `{ pincode, deliveryDays, codAvailable }`; `404` if not listed |
| DELETE | `/settings/pincodes/:pincode` | `204`, `404` if not listed |

A pincode is 6 digits and cannot start with 0 (`pincodeSchema` from `payments/pincode.ts`). `deliveryCharge` and `codFee` are 0–10000.

### Contact messages

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/contact-messages` | List, newest first (`isRead` filter) |
| PATCH | `/contact-messages/:id` | `{ isRead: boolean }` → the updated message |
| DELETE | `/contact-messages/:id` | `204` (e.g. spam); `404` if unknown |

`ContactMessage`: `{ id, name, email, phone, subject, message, isRead, createdAt }` (`phone` may be `null`).

### Reviews (moderation)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/reviews` | List |
| GET | `/reviews/:id` | Detail (same shape as an item) |
| DELETE | `/reviews/:id` | `204`; recomputes the product's `ratingAvg` / `ratingCount` in the same transaction |

List query: `q` (comment, product name or code, reviewer name or email), `productId`, `userId`, `rating` (exact, 1–5), `minRating` / `maxRating` (1–5, inclusive; `maxRating < minRating` → 400), `sort` (`createdAt_desc` default, `createdAt_asc`, `rating_asc`, `rating_desc`).

Item: `{ id, productId, userId, rating, comment: string | null, createdAt, product: { id, name, slug, code }, user: { id, fullName, email } }`. After the last review of a product is deleted, its `ratingAvg` is `0` and `ratingCount` is `0`. Reviews cannot be edited by the admin.

### Audit log

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/audit-log` | List, newest first. Filters: `adminId`, `from`, `to` (ISO date or datetime, inclusive; `to` before `from` → `400`) |

Item: `{ id, adminId, method, path, status, targetId, ip, createdAt, admin: { id, fullName, email } }`. `targetId` is the first path segment after the area that contains a digit (e.g. `12` for `/api/admin/products/12/images`, `560001` for a pincode), or `null` (e.g. for a create). Rows are written by the server only; there is no create/update/delete endpoint.

## Contact: `/api/contact`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/` | public, sensitiveLimiter | Store a contact-form message for the admin inbox |

```json
{ "name": "Priya S", "email": "priya@example.com", "phone": "+91 98765 43210", "subject": "Order help", "message": "Where is my order?" }
```

- `name` 2–100 chars; `email` as for signup (lowercased); `phone` optional (≤ 20 chars: digits, spaces, dashes, optional leading `+`; `""` counts as not given); `subject` 2–150; `message` 10–5000.
- `201 { "message": "Thanks for writing to us. We'll get back to you soon." }`. Nothing about the stored row is returned.
- A notification email (subject `Contact form #<id>: <subject>`, the sender's details and message, HTML-escaped) goes to `ADMIN_NOTIFY_EMAIL` through the mailer. It is non-blocking: a failed email is logged and the `201` is unaffected.
