# QA: storefront responsive and mobile audit

- **Date:** 2026-09-26, 19:00 to 19:20 IST
- **Scope:** the customer-facing storefront only (no admin pages). This was a read-only audit: no source files were changed.
- **Build under test:** `next dev` (Next 16) on :3003 against an API on :4003, using the seeded MySQL data.
- **Tooling:** a scripted Playwright 1.63 run in its own headless Chromium. Phones (360×740, 390×844, 414×896) used `isMobile` and `hasTouch`. The other sizes were 768×1024, 1024×768 and 1440×900.
- **Screenshots:** `/private/tmp/claude-501/-Users-rakshanshetty-Desktop-Developer-personal-Project-apsare-website/dbc42484-52b0-4710-b9ae-7b51438bd8d0/scratchpad/qa/`
  - One full-page shot per page and viewport, named `<page>_<viewport>.png`.
  - Interaction shots are named `flow-*.png`.

> **The code changed while the audit ran.** Antigravity edited the storefront during the run (`Header.tsx` at 19:01, `ProductView.tsx` at 19:01, `checkout/page.tsx` at 18:58, and the Footer after that).
> - I re-checked `home`, `shop` and `product` at 390 and 768 against the latest code at about 19:15.
> - Footer findings from the first pass (12px link targets, an unlabelled newsletter input) no longer reproduce, so they are left out.
> - Everything below was seen at 19:15 or later unless it is marked otherwise.

---

## 1. Summary: pages × viewports

**How to read the cells:**
- **FAIL** means one of these: horizontal overflow, a runtime crash (error boundary), or a broken core function.
- **WARN** means CLS of 0.1 or more.
- Tap-target and font-size findings are left out of this table and listed in §2.
- Logged-in pages were tested with a session for `customer@labelapsare.com`.

| Page | 360 | 390 | 414 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| home | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| shop | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| category/sarees | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| category/silk-sarees (sub) | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| search?q=silk | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| new-arrivals | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| offers | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| product/cotton-sleeveless-blouse | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| cart (logged in) | PASS | PASS | PASS | FAIL (ovf, CLS 0.23) | PASS | WARN (CLS 0.14) |
| cart (guest) | FAIL (items not shown) | FAIL | FAIL | FAIL | FAIL | FAIL |
| wishlist | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| checkout | FAIL (crash) | FAIL (crash) | FAIL (crash) | FAIL (crash, ovf) | FAIL (crash) | FAIL (crash) |
| checkout/success/[order] | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| login | FAIL (login broken) | FAIL | FAIL | FAIL (+ovf) | FAIL | FAIL |
| signup | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| forgot-password | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| account | PASS | PASS | PASS | FAIL (ovf, CLS 0.15) | WARN (CLS 0.17) | WARN (CLS 0.11) |
| account/addresses | FAIL (crash) | FAIL (crash) | FAIL (crash) | FAIL (crash, ovf) | FAIL (crash) | FAIL (crash) |
| account/orders | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| account/orders/[order] | PASS | PASS | PASS | FAIL (ovf, CLS 0.24) | WARN (CLS 0.10) | PASS |
| about | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| contact | PASS | PASS | PASS | FAIL (ovf) | PASS | PASS |
| 404 | PASS | PASS | PASS | PASS | PASS | PASS |

**Counts by severity:** 3 Blocker · 7 High · 12 Medium · 8 Low.

---

## 2. Issues by severity

### Blocker

**B1. Customer login always fails, and the UI shows no error.**
- **Where:** `/login` at all viewports; also every flow that needs a login (checkout, account, wishlist).
- **Files:** `client/src/context/AuthContext.tsx:54` (`login`) and `client/src/app/(store)/(auth)/login/page.tsx`.
- **What happens:**
  - The client posts `{ emailOrMobile, password, remember }`.
  - The API schema (`client/src/server/modules/auth/auth.schemas.ts`) expects `identifier`, so it answers `400 VALIDATION_ERROR` with the detail on `body.identifier`.
  - The login page puts that into `fieldErrors.identifier`. No field renders that key, and `generalError` is skipped because `fieldErrors` is not empty.
  - The user sees nothing at all, not even with valid credentials. Screenshot: `flow-login-valid-creds-390.png`.
- **Expected:** a valid login signs the user in, and a failed login shows a visible message.
- **Fix:** send `identifier: emailOrMobile` in `AuthContext.login`. Also map `fieldErrors.identifier` onto the email field, and fall back to `generalError` whenever no known field matched.

**B2. Checkout crashes to the error boundary ("Something Went Awry").**
- **Where:** `/checkout` at all viewports.
- **File:** `client/src/app/(store)/checkout/page.tsx:64` and `:81`.
- **What happens:**
  - `GET /api/addresses` returns `{ items: [...] }`, but the page treats it as `Address[]`.
  - The call `addresses.find` throws `TypeError: addresses.find is not a function`, which also raises a "Failed to load addresses" toast.
  - This blocks the whole COD checkout, so the end-to-end checkout stepper could not be tested in the UI. The test order was placed through the API instead.
  - Screenshot: `flow-checkout-1-address-390.png`.
- **Expected:** the address step renders with the default address selected.
- **Fix:** use `api<{ items: Address[] }>("/addresses").then(r => r.items)` in both `loadAddresses` and the effect.

**B3. The saved addresses page crashes.**
- **Where:** `/account/addresses` at all viewports.
- **File:** `client/src/app/(store)/account/addresses/page.tsx:38` and `:47`.
- **What happens:** the same shape mismatch as B2 causes `addresses.map is not a function`, and the error boundary replaces the page.
- **Fix:** read `.items` from the response, as in B2.

### High

**H1. Guest bag items are counted but never shown.**
- **Where:** `/cart` and the CartDrawer, as a guest, at all viewports.
- **Files:** `client/src/context/CartContext.tsx` (guest path), `client/src/app/(store)/cart/page.tsx:78`, `client/src/components/store/CartDrawer.tsx`.
- **What happens:**
  - After "Add to Bag" as a guest, `localStorage.apsare_guest_cart` holds `[{variantId, quantity}]` and the header badge shows 1.
  - The cart page and the drawer both say "Your Shopping Bag is Empty", so the quantity stepper and Remove cannot be used as a guest.
  - Screenshots: `flow-cart-guest-390.png` and `flow-cart-drawer-guest-390.png`.
- **Expected:** guest lines render with product details, a stepper and Remove.
- **Fix:** hydrate guest lines by fetching variant or product details for the stored `variantId`s, or keep a server cart keyed by an anonymous session.

**H2. The header nav wraps off both edges at 768 (tablet), on every page.**
- **Where:** `client/src/components/layout/Header.tsx`, the desktop nav: `nav.hidden.md:flex.justify-center.gap-8.whitespace-nowrap`.
- **What happens:**
  - At 768 the seven links are 775px wide inside a 768px bar.
  - Because the nav is `justify-center`, "SAREES" is clipped on the left (x=-7) and "OFFERS" on the right (to 775). `scrollWidth` becomes 775, so the page scrolls horizontally.
  - Screenshot: `home_768.png`, top of the page.
- **Fix:** show the desktop nav from `lg:` and keep the hamburger up to 1023px, or use `gap-5 md:gap-5 lg:gap-8` with `overflow-x-auto justify-start md:justify-center`.

**H3. The mobile nav drawer is not an accessible dialog: no Esc, no focus management, and the close button has no name.**
- **Where:** `Header.tsx`, the "Mobile Drawer Navigation" block, on every page at 360, 390 and 414.
- **What happens:**
  - The drawer has no `role="dialog"` or `aria-modal`, and focus stays on the page behind it.
  - Tab leaves the drawer (9 of 14 tabs stayed inside), Esc does nothing, and the body can still scroll.
  - The X close button has no accessible name.
  - After a backdrop close, focus goes to `<body>`, not the menu button. The menu button has no `aria-expanded`.
  - Backdrop-click close does work.
  - Screenshot: `flow-nav-drawer-open-390.png`.
- **Fix:** reuse `components/ui/Drawer.tsx`, which already handles Esc, `role="dialog"` and scroll lock. Otherwise add an Esc handler, a focus trap, `aria-label="Close menu"`, `aria-expanded`, and return focus to the trigger on close.

**H4. The mobile header icons are 32×32 or smaller, and the Sign-in link has no accessible name on phones.**
- **Where:** `Header.tsx` on every page at phone widths.
- **What happens:**
  - Open menu, search, wishlist and bag are `p-1.5` wrappers around 20px icons, so they measure 32×32.
  - The account link is 28×28, and its "Sign In" text is `hidden sm:inline`, so it has no name below 640px.
  - When logged in, the user-menu button is 46×28 with no `aria-label` and no `aria-expanded`.
- **Fix:** use `p-3` (or `min-h-11 min-w-11`) on all header icon buttons. Add `aria-label="Sign in"` / `aria-label="Account menu"` and `aria-expanded` to those two controls.

**H5. The preloader ignores reduced motion, cannot be skipped, and replays on every hard load.**
- **Where:** `client/src/components/ui/Preloader.tsx`, mounted in `components/providers/StoreProviders.tsx`, which sits in the root layout.
- **What happens:**
  - With `prefers-reduced-motion: reduce` emulated, 7 animations still ran: the `animate-pulse` lotus, the infinite x-translate progress bar (its transform moved −58px to −28px) and motion fade-ins.
  - The overlay is a full-screen `z-50` layer with no role or label. It blocks input for about 1.2s, and neither tapping nor Esc dismisses it early.
  - It is shown again on every full page load; nothing is stored in sessionStorage.
- **Fix:**
  - Gate the preloader on `useReducedMotion()` and on a `sessionStorage` "seen" flag, so it shows once per session.
  - Add `motion-reduce:animate-none`, and a click/Esc handler that dismisses it.
  - Better still, drop the overlay for returning navigations.

**H6. Hero carousel arrows cover the headline copy on phones.**
- **Where:** `client/src/components/store/HeroBanner.tsx:126-137`; home at 360, 390 and 414.
- **What happens:** the absolute `left-4` and `right-4` arrow buttons sit on top of the subtitle, which renders as "…loom lehengas…" with "Heir" hidden under the left arrow. Screenshot: `home_390.png`.
- **Fix:** hide the arrows below `sm` (swipe and dots are enough), or give the text container `px-14` on mobile.

**H7. The iOS zoom-on-focus trap: key inputs use font-size under 16px.**
- **Where:** each input below, on phones.
- **Inputs affected:**
  - the mobile search input in the Header: `text-xs`, 12px
  - the PDP pincode input: 12px
  - the cart promo code input: 12px
  - the login and signup inputs: 14px
- **What happens:** iOS Safari zooms the page when any of these gets focus, and the layout then looks broken until the user pinches back.
- **Fix:** use `text-base sm:text-xs` (16px on mobile) on every `<input>`, `<select>` and `<textarea>`, or set a global `input{font-size:16px}` below `sm`.

### Medium

**M1. The toast stack overlaps the PDP sticky "Add to Bag" bar.**
- **Where:** `/product/*` at 390. `components/ui/Toast.tsx:78` (`fixed bottom-4 right-4 z-50`) against the `ProductView.tsx:737` sticky bar (`fixed bottom-0 z-30`, 65px tall).
- **What happens:** the "Added … to bag" toast (y 776–828) sits on the bar (y 779–844) and covers its buttons. The toast column is also offset: the container is 384px wide with `right-4`, so it starts at x=-10, and the card is not centred. Screenshot: `flow-pdp-sticky-add-toast-390.png`.
- **Fix:** on mobile use `inset-x-4 bottom-20 max-w-none`, or lift toasts by the sticky bar height through a CSS variable while the bar is mounted.

**M2. The PDP sticky bar hides the end of the page.**
- **Where:** `ProductView.tsx:737`, `/product/*` at phone widths.
- **What happens:** nothing reserves 65px at the bottom (the body and `main` have `padding-bottom: 0`). At full scroll the footer's last lines ("Label Apsáre", "© 2026 …") sit under the bar. Screenshot: `flow-pdp-bottom-sticky-390.png`.
- **Fix:** add `pb-20 sm:pb-0` to the PDP wrapper while the bar is shown.

**M3. The product gallery has no swipe and no zoom on touch.**
- **Where:** `ProductView.tsx`, the gallery section, at phone widths.
- **What happens:** a horizontal touch-swipe on the main image does not change it. Tapping opens no zoom or lightbox; the only zoom is the `hover:scale-105` effect, which does nothing on touch. Thumbnails do switch images, but they are 64×80 with no accessible name or `aria-pressed`.
- **Fix:** use a scroll-snap carousel (`overflow-x-auto snap-x`) for the main image, add tap-to-open fullscreen zoom, and give thumbnails `aria-label="View image N"` and `aria-current`.

**M4. PDP controls are too small, and the variant pickers have no selected state for assistive tech.**
- **Where:** `ProductView.tsx`, variant and quantity controls, on phones.
- **What happens:**
  - The quantity "−" and "+" buttons are 20×20 with no `aria-label`.
  - Size chips are 48×34. Colour and size buttons have no `aria-pressed` or radio semantics.
  - The "Color:" and "Size:" `<label>` elements are not associated with any control.
- **Fix:**
  - Make the steppers `h-11 w-11` with `aria-label="Decrease quantity"` / `"Increase quantity"`.
  - Give the chips `min-h-11`.
  - Wrap each group in `role="radiogroup" aria-labelledby`, with `role="radio" aria-checked` on each chip.

**M5. The pincode checker input is not mobile-friendly.**
- **Where:** `ProductView.tsx`, the pincode input.
- **What happens:** `type="text"` has no `inputMode="numeric"`, no `autocomplete="postal-code"` and no label (placeholder only). The field is 12px (see H7). Invalid input only raises a toast. The check itself works: 560038 returns "Delivery by 2026-09-28 … COD available".
- **Fix:** add `inputMode="numeric" pattern="\d{6}" autoComplete="postal-code" aria-label="Delivery PIN code"`, and show the error inline.

**M6. The login form's field errors are not wired for assistive tech, and some are silent.**
- **Where:** `login/page.tsx` and `components/ui/Input.tsx`.
- **What happens:**
  - An empty submit correctly shows "Please enter your email or mobile" and sets `aria-invalid`.
  - After a failed submit, focus stays on the submit button, not on the first invalid field.
  - Inputs have no `aria-describedby` pointing at their error, and errors have no `role="alert"`.
  - "notanemail" plus any password gives no message at all, which is the same root cause as B1.
- **Fix:** in `Input`, set `aria-describedby={errorId}` and give the error `role="alert"`. On a failed submit, focus the first invalid field.

**M7. Filter chips and pagination buttons have no accessible names, and the remove "×" is 12×12.**
- **Where:** `client/src/components/product/ProductListing.tsx:355-420`; `client/src/components/ui/Pagination.tsx:54` (`h-9 w-9`). Affects shop, category, search, new-arrivals and offers.
- **What happens:**
  - The active-filter pill "×" buttons are 12×12 with no label.
  - The Prev and Next pagination buttons are 36×36 with no name.
  - Page buttons are 36×36.
  - The sort `<select>` has no label (only the visible value).
- **Fix:**
  - Give the pill buttons `aria-label="Remove filter Fabric: X"` and `p-2`.
  - Give Prev/Next `aria-label`s and `h-11 w-11`.
  - Give the select `aria-label="Sort products"`.

**M8. The filter drawer does not move focus into itself.**
- **Where:** `ProductListing.tsx` and `components/ui/Drawer.tsx`; shop at 390.
- **What happens:**
  - The drawer does have `role="dialog"` and `aria-modal="true"`, and Esc closes it.
  - When it opens, focus stays on the Filters button behind it.
  - Applying a facet updates the URL right away (`/shop?fabric=Georgette`) and keeps the drawer open, with a "View 6 Designs" CTA.
  - "Clear all" resets the URL to `/shop`.
- **Fix:** in `Drawer`, focus the close button or panel on open and trap Tab.

**M9. Product card tap targets are small.**
- **Where:** `client/src/components/product/ProductCard.tsx:96-100`; home, listing pages, wishlist and PDP rails.
- **What happens:** the wishlist heart on each card is 32×32, and the product-title link is 24px tall. (The whole image is also a link, so the title link is a lesser problem.)
- **Fix:** make the heart `p-3` (44px), and give the title link `py-2` or make the whole card one link.

**M10. The LCP image is lazy-loaded on listing pages.**
- **Where:** shop, category, subcategory, search, new-arrivals, offers, wishlist, about and cart, at all viewports.
- **What happens:**
  - The first `ProductCard` image, or the About banner, is the LCP element and has `loading="lazy"`.
  - On home, the hero LCP is not lazy but has no `fetchpriority`. Next dev also warns that `/images/categories/sarees.jpg` was detected as LCP and should load eagerly.
- **Fix:** pass `priority`/`preload` (or `loading="eager" fetchPriority="high"`) to the first 2–4 `ProductCard`s through an `index` prop, and to the About hero and the category tiles above the fold.

**M11. Layout shift from the footer when client data loads.**
- **Where:** account, cart and order-detail at 768, 1024 and 1440; every page at 768.
- **What happens:**
  - The shift source is always `footer.mt-auto`, which moves as the client-fetched content grows.
  - The worst CLS values were order-detail 768 at 0.24, cart 768 at 0.23, account 1024 at 0.17 and cart 1440 at 0.14.
  - At 768, every page shows CLS 0.09 from the footer jumping below the fold after hydration.
- **Fix:** give the skeleton/loading states (`app/(store)/loading.tsx`, the account/cart loaders) a `min-h-[60vh]` near the final height, or set `min-h-screen` on `<main>`.

**M12. Account pages on phones put the whole sidebar menu above the content.**
- **Where:** `client/src/app/(store)/account/layout.tsx`; account, account/orders and order-detail at 360, 390 and 414.
- **What happens:** the profile card and five menu links (about 330px) come before the page content, so on the order detail the order header starts near y=620 and the items are below the fold. The menu links are 36px tall. Screenshot: `account-orders_*_390`.
- **Fix:** below `md`, collapse the sidebar into a horizontal scrollable tab row (`overflow-x-auto`, `min-h-11` tabs).

### Low

**L1. Many text sizes are under 12px on every page.**
- **Where:**
  - the announcement bar in `Header.tsx`: `text-[11px]`
  - the "LABEL" wordmark: `text-[10px]`
  - the header badges: 9px
  - the ProductCard category, badges and "Sizes:" row: 10px
  - the eyebrow headings (`text-[10px]` and `text-[11px]` uppercase) on the cart, account, wishlist, success and 404 pages
  - PDP helper text: 11px
  - the sticky-bar variant line: 10px
  - the coupon list in the cart: 10–11px
- **Fix:** set a 12px floor (`text-xs`) for body and meta text. Keep smaller sizes only for decorative letter-spaced wordmarks.

**L2. There are nested `<main>` landmarks.**
- **Where:** shop, category, search, new-arrivals and offers (`ProductListing.tsx`, `<main className="flex-1">`), and every account page (`account/layout.tsx:130`), each inside the store layout's `<main>`.
- **Fix:** change the inner ones to `<section>` or `<div>`.

**L3. The 404 page has no header, footer or `<main>`, and its buttons wrap.**
- **Where:** `client/src/app/not-found.tsx`.
- **What happens:** the page renders outside the store layout, so there is no navigation back apart from its two buttons. At 390, "RETURN TO HOME" and "EXPLORE COLLECTIONS" each wrap onto two lines in side-by-side pills.
- **Fix:** render inside the store chrome (a `(store)/[...not-found]` route or a shared layout), and stack the buttons with `flex-col sm:flex-row`.

**L4. The coupon toast contradicts the inline error.**
- **Where:** `cart/page.tsx:52-66`.
- **What happens:** applying `EXPIRED15` shows the inline error "Invalid or expired coupon" together with a success toast, "Coupon EXPIRED15 applied!". `applyCoupon` resolves even when the server rejects the code. WELCOME10 works correctly: toast, a "Coupon Discount" line, and the total updates.
- **Fix:** have `applyCoupon` throw, or return `ok`, when `cart.coupon` is not set after the refresh, and toast based on that.

**L5. The mobile cart has no sticky checkout bar.**
- **Where:** `/cart` at phone widths.
- **What happens:** the order summary and CTA sit below the item list and the coupon card, so with 2 or more items the CTA is several screens down.
- **Fix:** add a `fixed bottom-0 sm:hidden` bar with the total and a "Checkout" button, and reserve padding for it.

**L6. The mobile search input has no label, and results stay stale after submitting.**
- **Where:** `Header.tsx`, the mobile search dropdown.
- **What happens:** the search toggle works: the input autofocuses, and Enter goes to `/search?q=silk` with 16 results. The input has no `aria-label` (placeholder only), and the toggle has no `aria-expanded`.
- **Fix:** add `aria-label="Search products"` to the input and `aria-expanded` to the toggle.

**L7. Pagination and grids.**
- **Where:** `/shop` at 1024 and 1440.
- **What happens:** the shop page size is 20 with a 3-column grid, so the last row on page 1 has 2 cards and an orphaned column. Pagination itself works: page 2 goes to `/shop?page=2` and scrolls to the top.
- **Fix:** use a page size of 24 or 18, a multiple of 2 and 3.

**L8. Header cart badge hydration mismatch.**
- **Where:** `Header.tsx:210`, for guests with a stored guest cart.
- **What happens:** the server renders no badge and the client renders "1", so React logs "Hydration failed…" and regenerates the tree.
- **Fix:** read the localStorage count in an effect after mount (`useSyncExternalStore` with a server snapshot of 0).

---

## 3. Works well

- There is no horizontal overflow at 360, 390, 414, 1024 or 1440 on any page. The only overflow is H2, at 768.
- No image had a missing `alt` or a broken `src`, and every responsive `next/image` has `sizes`.
- On the mobile nav drawer, the backdrop tap closes it and the links are well spaced.
- The shop filter drawer:
  - updates the URL immediately (`?fabric=Georgette`) and shows an active-filter pill
  - has a "View N Designs" CTA and "Clear all", and closes on Esc
  - has `role="dialog"` and `aria-modal`.
- Sort works: `?sort=price_asc`.
- Pagination works: `?page=2`, and the page scrolls to the top.
- On the PDP:
  - the colour and size pickers update the selection, and out-of-stock sizes are disabled and struck through
  - thumbnail taps switch the image
  - the pincode check returns the delivery date and COD availability
  - the new mobile sticky Add to Bag bar has 40px buttons.
- For a logged-in customer:
  - Add to Bag opens the cart drawer, which is `role="dialog"` and closes on Esc
  - the cart quantity stepper updates the server and the totals
  - WELCOME10 applies and removes cleanly
  - the wishlist heart toggles and the header badge updates.
- A guest wishlist tap redirects to `/login?redirect=/shop`.
- The checkout success and order detail pages render well at every size. The order reference is prominent and the CTAs are full-width on mobile.
- Keyboard use at 1440:
  - the tab order through the header is logical (logo → search → search button → Sign in → wishlist → bag → category links → hero CTA → carousel controls)
  - every stop showed a visible focus ring, from the browser default outline or the Button focus ring.
  - There is no skip link, which would be a nice-to-have.
- The desktop layouts at 1024 and 1440 look clean: sidebar filters, a 3-column grid, and a 2-column PDP from 1024 up.
- Console: no errors on the public pages apart from the expected 401 on `/auth/me` when logged out. The only errors are the crashes in B2 and B3 and the hydration warning in L8.

## 4. Test data and cleanup

- Test order `APS-260926-2T9JY` (COD, 2 × Cotton Sleeveless Blouse 36/Black) was placed through `POST /api/orders`, because the checkout UI crashes (B2).
- It was then cancelled through `POST /api/orders/:n/cancel`, which restocks, and hard-deleted along with its items, history and payment.
- The test cart line and wishlist item were deleted.
- Variant stock matches the pre-test snapshot exactly, and coupon `usedCount` is unchanged at 0.
