# Label Apsáre: Build Plan

Status: **Server phases implemented**: every API module (auth, users, addresses, categories, products + search/facets/home, wishlist, cart + pricing, coupons, orders, payments stub, uploads, admin) is live, with the migration, idempotent seed (`npm run db:seed`) and the contract in [`docs/API.md`](API.md). **The storefront and admin UI (`client/`) is being built by Antigravity** against that contract.

## Decisions so far

| Area | Choice |
| --- | --- |
| Catalog | Women-first ethnic wear: Sarees, Blouses, Lehengas, Kurtas & Sets, Dupattas. The category model is a tree, so Men/Kids can be added later with no schema change. |
| Frontend | Next.js 16 App Router + TypeScript + Tailwind 4 |
| Backend | Next.js Route Handlers in the same app (`client/src/app/api/**`, services in `client/src/server/`), REST under same-origin `/api/*`. The separate Express server was removed in the migration (see `MIGRATION.md`). |
| Database | PostgreSQL via Prisma 7 (pg driver adapter locally/docker, Neon driver adapter in production against [Neon](https://neon.tech)) |
| Images | Cloudinary (admin uploads through `/api/uploads`) |
| Auth | Email or mobile + password (bcrypt), JWT in an httpOnly cookie. "Remember me" gives a 30-day token instead of 7 days. |
| Payments | `PaymentProvider` interface (`client/src/server/modules/payments/provider.ts`). COD ships first; Razorpay/Stripe plug in later. |
| Pricing | Admin enters **MRP + sale price** only. `discountPercent` is computed on save (`client/src/server/utils/pricing.ts`) and stored so it can be filtered and sorted. |

## Theme (from the logo)

- **Sage** `#9DAB78` (logo background): header bar, hero, surfaces
- **Gold** `#C4A052`: accents, dividers, CTA text
- **Ink** `#1B1B18`: text, primary buttons
- **Ivory** `#FBF9F3`: page background
- Fonts: **Cormorant Garamond** for headings (matches the high-contrast serif wordmark) and **Josefin Sans** for body and spaced capitals (matches "LABEL" and the tagline).

Tokens live in `client/src/app/globals.css` (`bg-sage-400`, `text-gold-500`, `font-display`, …).

## Data model (summary)

`User` (CUSTOMER/ADMIN) · `Address` · `PasswordResetToken` · `Category` (tree) · `Product` (code, fabric, occasion, specs JSON, mrp, salePrice, discountPercent, feature flags: new/trending/best-seller/deal) · `ProductImage` · `ProductVariant` (size × colour, **stock lives here**) · `Review` · `CartItem` · `WishlistItem` · `Coupon` · `Order` (address + prices snapshotted) · `OrderItem` (product snapshotted) · `OrderStatusHistory` · `Payment` · `Banner` · `ServiceablePincode`.

## Phases

Each phase ends with a working, testable slice. Nothing is committed or pushed without your approval.

### Phase 1: Foundations
- Postgres running, first migration, seed script (admin user, categories, ~20 sample sarees with variants)
- Zod request validation middleware; consistent error format
- Shared UI kit: Button, Input, Select, Badge, Modal, Drawer, Toast, Skeleton, Pagination

### Phase 2: Auth & account
- API: signup, login (email or mobile), logout, `me`, forgot/reset password (hashed one-time token, 30-min expiry, email sender stub)
- Pages: Login, Sign Up, Forgot/Reset Password
- Client auth context, `proxy.ts` guard for `/account/*` and `/admin/*`
- My Profile (view/edit), My Addresses (CRUD + set default)
- Separate admin login at `/admin/login` (same user table, role = ADMIN)

### Phase 3: Admin product management
- Categories CRUD
- Product list with search, filters, stock badges; add/edit form: details, MRP + sale price with live discount preview, multi-image upload to Cloudinary (reorder, delete), size × colour variant grid with stock, specs key/value, feature flags, active toggle
- Bulk actions: activate/deactivate, delete

### Phase 4: Catalog browsing
- `GET /api/products`: search (name, brand, category, product code; Postgres full-text search over a `tsvector`/GIN index), filters (category, fabric, size, colour, price range, discount ≥ X%, in stock, rating ≥ X), sort (recommended, newest, price ↑/↓, discount, popularity), pagination, facet counts for the filter sidebar
- ProductCard: image, name, brand, category, MRP, sale price, % off, sizes, colours, wishlist + add to bag
- Pages: Home (banner + 6 product rails), Shop, Category, New Arrivals, Offers, Search (URL-driven filters, mobile filter drawer)
- Product Details: gallery with zoom, variant pickers, qty, stock state, pincode check, specs, Add to Bag / Buy Now / Wishlist, similar products

### Phase 5: Wishlist & cart
- Wishlist add/remove and move to bag
- Cart: add/update qty/remove, move to wishlist, stock checks
- Order summary: total MRP, discount, delivery charge (free above threshold), coupon discount, final amount
- Guest cart in localStorage, merged into the server cart on login

### Phase 6: Checkout & orders
- Checkout stepper: Address → Summary → Payment → Confirmation
- Order placement in one DB transaction: re-price from DB, lock and decrement variant stock, snapshot items and address, apply coupon, create payment record
- Payment options shown: COD, UPI, Card, Net Banking (only COD is live until a gateway is chosen)
- My Orders list and Order Details with a status timeline; cancel while still PLACED/CONFIRMED (restocks items)

### Phase 7: Admin operations
- Dashboard: total products/orders/customers/sales, today's orders, pending orders, low-stock and out-of-stock lists, sales-over-time and orders-by-status charts
- Orders: list/filter, detail, status updates (writes to `OrderStatusHistory`)
- Customers: list, detail with their orders
- Coupons CRUD; homepage banners CRUD; settings (delivery charge, free-shipping threshold, serviceable pincodes)

### Phase 8: Polish & launch
- About / Contact pages (contact form → email)
- SEO: metadata per product, sitemap, Open Graph images
- Accessibility and responsive QA (mobile, tablet, desktop)
- Security: rate-limit auth endpoints, CSRF strategy for cookie auth, input sanitising, admin audit log
- Deploy: client + API on Vercel, database on Neon (pooled connection string, `sslmode=require`), Cloudinary production keys

## Open questions

1. **GitHub repo**: what's the URL? (It wasn't in your message.)
2. **Categories**: is Sarees / Blouses / Lehengas / Kurtas & Sets / Dupattas the right list? Any sub-types (Silk, Cotton, Georgette, Banarasi, Bridal…)?
3. **Sizes**: sarees are usually "Free Size". Do blouses need standard sizes (32–44) or custom stitching / made-to-measure?
4. **Filters specific to sarees**: add Fabric, Occasion, Work/Craft (zari, embroidery, printed), and "blouse piece included"?
5. **Brand field**: is everything "Label Apsáre", or will you sell other labels too? If it's only yours, the Brand filter can be hidden.
6. **Payments**: which gateway later, Razorpay (UPI/cards/net banking in India) or Stripe? Is COD available everywhere, and does it carry an extra fee?
7. **Delivery**: flat charge and free-shipping threshold (the placeholder says free above ₹1,999)? Pincode serviceability: a manual list, or a courier API (Shiprocket, Delhivery)?
8. **Emails/SMS**: which provider for order confirmation and password reset (Resend, SendGrid, AWS SES)? Do you want OTP login on mobile?
9. **Guest checkout**: allow it, or require an account?
10. **Admin users**: one owner account, or several staff with different permissions?
11. **Content**: do you have product photos and hero banners, or should we use placeholders for now?
12. **Hosting**: any preference (Vercel + Railway, a single VPS, AWS)?
13. **Admin section 11 onwards**: the spec you pasted was cut off at "Admin Product Management". Please share the rest so nothing is missed.
