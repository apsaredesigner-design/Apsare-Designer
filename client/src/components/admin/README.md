# Admin UI kit

Shared building blocks for `/admin/*`. Components live in `@/components/admin`; data hooks, the API client and formatters live in `@/lib/admin`. Every file starts with a short usage comment.

## Structure

```
lib/admin/
  api.ts            adminApi (the ONE typed client), authApi, adminGet/adminSend, toQueryString
  types.ts          the ONE set of admin request/response types
  helpers/          pure helpers and constants, no network calls:
                    products (filters, flags, limits), categories (tree sort/flatten, moveSibling, slugify),
                    coupons (state, form <-> body, validation, MAX_*), orders (statuses, CSV URL, IST days),
                    settings (pincode parsing), banners (list constants), reviews, audit,
                    move-item, safe-url
  use-admin-list.ts / use-admin-query.ts / use-mutation.ts / use-selection.ts / upload.ts / errors.ts / format.ts
components/admin/
  *.tsx             the kit (table below)
  data-table/       DataTable parts: TableHead, TableBody, BulkBar, Column type
  image-uploader/   ImageUploader parts: useImageUploads, Dropzone, ImageTile/PendingTile
  shared/           page-level pieces shared by catalog/ and ops/: Section (+ Row), LoadError, Thumb,
                    PageFallback, Stars, DateRangeFilter, useCategoryTree
  catalog/          products, product-form, categories, reviews
  ops/              orders, customers, coupons, banners, messages, settings, audit
```

Rules: every server call goes through `adminApi` (or `useAdminList` / `useAdminQuery`, which use `adminGet`), so a 401 anywhere redirects to the login. Only `adminGet`/`adminSend` and `authApi` call the raw `api()`. Types come from `@/lib/admin/types`; icons from `@/components/admin/icons`; writes use `useMutation`.

Design: an ivory page, white cards with hairline `ink/10` borders, a deep-ink sidebar with sage and gold accents, Cormorant Garamond (`font-display`) titles and Josefin Sans UI text. All controls are at least 44px tall, have a gold `focus-visible` ring, and animate only under `motion-safe`.

## Page recipe (list page)

```tsx
// app/admin/(panel)/products/page.tsx (server): export metadata, render <Suspense fallback={<PageFallback />}><ProductsView/></Suspense>
"use client";
const list = useAdminList<AdminProductListItem>("/admin/products", { filters: ["stock", "isActive"], defaultSort: "createdAt_desc" });
const sel = useSelection(list.items, (p) => p.id);
const bulk = useMutation((ids: number[]) => adminApi.products.bulk(ids, "deactivate"), {
  success: (r) => `${r.affected} products deactivated`,
  onSuccess: () => { sel.clear(); list.reload(); },
});

<PageHeader title="Products" actions={<ButtonLink href="/admin/products/new" icon={<PlusIcon />}>New product</ButtonLink>} />
<FilterBar search={<SearchInput label="Search products" value={list.search} onChange={list.setSearch} />}
           active={list.hasActiveFilters} onClear={list.clearFilters}>
  <FilterSelect label="Stock" value={list.filters.stock} onChange={(v) => list.setFilter("stock", v)}
                options={[{ value: "", label: "Any" }, { value: "low", label: "Low" }, { value: "out", label: "Out" }]} />
</FilterBar>
<DataTable caption="Products" columns={columns} rows={list.items} rowKey={(p) => p.id}
  loading={list.loading} error={list.error} onRetry={list.reload}
  sort={list.sort} onSortChange={list.setSort}
  selectable selectedIds={sel.selected} onSelectionChange={sel.setSelected} rowLabel={(p) => p.name}
  bulkActions={<Button size="sm" onClick={() => bulk.mutate(sel.selected)} loading={bulk.pending}>Deactivate</Button>}
  footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />} />
```

`useAdminList` reads `useSearchParams`, so the client component using it must sit inside `<Suspense fallback={<PageFallback />}>` (`@/components/admin/shared/PageFallback`).

## Hooks and helpers (`@/lib/admin`)

| Export | Usage |
| --- | --- |
| `adminApi` | Typed calls: `dashboard()`, `products.{list,get,create,update,remove,setStatus,bulk}`, `categories.{list,get,create,update,remove,tree}`, `orders.{list,get,setStatus}`, `customers.{list,get,setStatus,setRole}`, `coupons.{list,get,create,update,remove}`, `banners.{list,get,create,update,remove,reorder}`, `settings.{get,update,pincodes.{list,create,bulk,update,remove}}`, `contactMessages.{list,setRead,remove}`, `reviews.{list,get,remove}`, `auditLog.list`. Every function takes an optional `init` last (`{ signal }`). |
| `authApi` | `me()`, `adminLogin({ identifier, password, remember })`, `logout()`. |
| `toQueryString(obj)` | `?a=1&b=x`, dropping empty values. |
| `useAdminList<T>(path, { filters, defaultSort, defaultLimit, debounceMs })` | URL-synced list. Returns `items, meta, loading, error, isEmpty, reload, setItems(fn)`, the params `page, limit, q, sort, filters, search, hasActiveFilters`, and setters `setSearch` (300ms debounce), `setPage`, `setLimit`, `setSort`, `setFilter`, `setFilters`, `clearFilters`, `updateParams`. Any change except the page resets to page 1. Stale requests are aborted. |
| `useAdminQuery<T>(path \| null)` | A single GET: `{ data, loading, error, reload, setData }`. Keeps the last data while reloading; `null` skips the fetch. |
| `useMutation(fn, { success, error, onMutate, onSuccess, onError, onSettled })` | `{ mutate, pending, error, fieldErrors, reset }`. `mutate` never throws; it resolves to the result or `undefined`. Toasts on success (if `success` is set) and on error (a friendly message unless `error: false`). Every callback also receives the `mutate` arguments, so `onMutate` can apply an optimistic update and `onError` roll it back (see `catalog/products/useActiveToggle.ts`). |
| `useSelection(items, getId)` | `{ selected, setSelected, clear, isSelected }`, limited to the ids on screen. |
| `upload(files, { signal })` | `POST /uploads/image` as multipart FormData with credentials. It deliberately sets no Content-Type. Returns `UploadedImage[]` and throws `ApiError` (a 401 redirects to the login). |
| `deleteUpload({ url, publicId })`, `validateImageFile(file)`, `UPLOAD_LIMITS` | Storage cleanup and the client-side pre-checks (JPEG/PNG/WebP/AVIF, 5 MB, 10 files). |
| `toApiError(e)`, `errorMessage(err)`, `isAbortError(e)` | Normalise errors and turn them into friendly copy. |
| `formatINR`, `formatCompactINR`, `formatNumber`, `formatDate`, `formatDateTime`, `formatDay`, `humanize` | `en-IN` formatting (dates in IST). |
| Types | `AdminProductListItem`, `AdminProduct`, `AdminProductInput`, `BulkProductResult` (with `skipped`), `AdminCategory`, `CategoryTreeNode`, `AdminOrderListItem`, `AdminOrder` (with `nextStatuses`), `AdminCustomer`, `AdminCustomerDetail` (with `stats`), `AdminCoupon` / `AdminCouponListItem` (with `perUserLimit`, `firstOrderOnly`), `AdminReview`, `ContactMessage`, `AuditLogEntry`, `StoreSettingsInput`, `PincodeInput`, `UploadedImage`, plus re-exports from `@/types`. |

## Components (`@/components/admin`)

| Component | Key props |
| --- | --- |
| `AdminShell` | `children`. The sidebar (`ADMIN_NAV`), a drawer below `lg`, the top bar with a scoped search (`/admin/<orders\|products\|customers>?q=`) and `AdminMenu`. Mounted by the panel layout; pages render only their content. |
| `AdminSessionProvider` / `useAdminSession()` | The client auth gate (GET `/auth/me`; 401 goes to login with `?next=`, a non-admin to `?reason=forbidden`). The hook returns `{ user, logout }`. |
| `PageHeader` | `title, description?, actions?, breadcrumbs?: {label, href?}[]`. Renders the page's `<h1>`. |
| `DataTable<T, Id>` | `caption, columns: Column<T>[], rows, rowKey, loading?, error?, onRetry?, sort?, onSortChange?, selectable?, selectedIds?, onSelectionChange?, rowLabel?, bulkActions?, empty?, skeletonRows?, footer?`. Each `Column` has `{ id, header, cell(row), sort?: { asc?, desc?, first? }, align?, hideBelow?, rowHeader? }`, where the `sort` values are the API's exact `field_dir` strings. ↑/↓ move between rows. |
| `Pagination` | `meta, onPageChange, onLimitChange?, pageSizes?` (default 10/20/50/100). Also exports `pageList(current, total)`. |
| `SearchInput` | `value, onChange, label, placeholder?, showLabel?`. Esc clears it. |
| `FilterBar` / `FilterSelect` | `search?, children, active?, onClear?, end?` / `label, value, onChange(v \| null), options`. |
| `StatusBadge` / `Badge` | `status: OrderStatus \| PaymentStatus` / `tone: neutral\|success\|warning\|danger\|info\|gold`. `ORDER_STATUS_COLOR` and `ORDER_STATUS_TEXT` are shared with the charts. |
| `Button` / `ButtonLink` | `variant: primary\|secondary\|ghost\|danger\|gold`, `size: sm\|md`, `loading`, `icon`. `buttonClasses()` gives the same classes for anything else. |
| `IconButton` | `label` (required, used as the aria-label), `variant: ghost\|secondary\|danger`, `tone: dark\|light`. |
| `Input` / `Textarea` / `Select` | Native props plus `invalid?`. `Input` adds `prefix`/`suffix`; `Select` adds `options?`. Inside a `FormField` they pick up the id and aria wiring automatically. |
| `Checkbox` | `label?, description?, indeterminate?` plus the native checkbox props. |
| `Switch` | `checked, onChange(bool), label? \| aria-label, description?, size?`. |
| `FormField` | `label, name?, errors? (ApiError.fieldErrors), error?, hint?, required?, hideLabel?`. `useFormField()` wires up custom controls. |
| `Modal` | `open, onClose, title, description?, footer?, size: sm\|md\|lg, dismissible?, initialFocus?`. |
| `ConfirmDialog` | `open, title, description?, confirmLabel?, tone: danger\|default, loading?, onConfirm, onCancel`. Focus starts on Cancel. |
| `Drawer` | `open, onClose, title?, side: left\|right, width?, footer?, hideHeader? + ariaLabel?, panelClassName?`. |
| `Dialog` | The native `<dialog>` primitive behind the three above: focus trap (the page becomes inert), Esc, backdrop click and focus restore. |
| `ToastProvider` / `useToast()` | `toast.success/error/info(title, { description })`. Errors use `role=alert`; the others use `status`. |
| `Skeleton` / `SkeletonText` | `className` / `lines`. |
| `EmptyState` | `title, description?, action?, icon?, tone: neutral\|error, compact?`. |
| `StatCard` | `label, value, hint?, icon?, href?, tone: default\|attention, loading?`. |
| `LineChart` | `title, description?, data: {label, value}[], valueLabel?, formatValue?, formatAxis?, height?`. Responsive width, a hover crosshair, ←/→ keyboard reading, `<title>`/`<desc>` and a hidden data table. |
| `DonutChart` | `title, description?, data: {label, value, color}[], centerLabel?, formatValue?, size?`. A legend with values and shares, and a hidden data table. |
| `ImageUploader` | `label, value: UploaderImage[], onChange, max?, withAlt?, onRemoveExisting?, disabled?, hint?`. Drag-and-drop or picker, per-file upload with a progress bar, reorder by drag or ←/→ buttons, alt text, remove. An image uploaded in this session is deleted from storage when it is removed. With `max={1}` plus a URL input it is the single-image field of the banner and category forms. |
| Icons | `import { BoxIcon } from "@/components/admin/icons"` (also `Icons.*` from the index). Add new icons there with `make()` (24×24, 1.5px stroke); never define SVG icons in feature folders. |
| `shared/Section` / `Row` | `id?, title, description?, actions?, error?, className?` / `label`. The titled card of forms and detail pages. |
| `shared/LoadError` | `title, error: ApiError \| null, onRetry?, action?, notFoundTitle?`. A 404 or `null` error shows "not found" without a retry. |
| `shared/Thumb` | `src, alt, className?` (sets the size; default `size-14`). |
| `shared/PageFallback` | The Suspense fallback for every list page. |
| `cx`, `focusRing`, `fieldBase`, `card` | Shared class helpers (`./styles`). |

## Auth flow

1. `src/proxy.ts`: when there is no `token` cookie, `/admin/*` (except `/admin/login`) redirects to `/admin/login?next=…` and `/account/*` redirects to `/login?next=…`.
2. `app/admin/(panel)/layout.tsx`: `ToastProvider` → `AdminSessionProvider` (GET `/auth/me`, role check) → `AdminShell`.
3. `/admin/login` posts to `/auth/admin/login` and then redirects to a safe `next` (only `/admin…` paths) or to `/admin/dashboard`.
