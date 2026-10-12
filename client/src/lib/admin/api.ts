/**
 * adminApi: the ONE typed client for `/api/admin/*`. Every admin page and hook calls
 * the server through it (or through `useAdminList` / `useAdminQuery`, which use
 * `adminGet`), so a 401 anywhere sends the browser to the admin login.
 *
 *   const stats = await adminApi.dashboard();
 *   const page  = await adminApi.products.list({ page: 1, q: "silk", stock: "low" }, { signal });
 *   await adminApi.orders.setStatus("APS-…", { status: "SHIPPED", note: "AWB 123" });
 *
 * Every function takes an optional `init` (RequestInit) last, e.g. `{ signal }`.
 * For lists, prefer `useAdminList(path)`, which builds the query from the URL.
 * Only `adminGet`/`adminSend` (which add the 401 redirect) and `authApi` (which handles
 * its own 401s) call the raw `api()`.
 */
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types";
import type {
  AdminBannerInput,
  AdminCategory,
  AdminCategoryDetail,
  AdminCategoryInput,
  AdminCoupon,
  AdminCouponInput,
  AdminCouponListItem,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDashboardStats,
  AdminOrder,
  AdminOrderListItem,
  AdminProduct,
  AdminProductInput,
  AdminProductListItem,
  AdminReview,
  AuditLogEntry,
  Banner,
  BulkPincodeResult,
  BulkProductAction,
  BulkProductResult,
  CategoryTreeNode,
  ContactMessage,
  ListQuery,
  OrderStatus,
  Paginated,
  PincodeInput,
  PincodePatch,
  Role,
  RoleResult,
  ServiceablePincode,
  StatusResult,
  StoreSettings,
  StoreSettingsInput,
} from "./types";

type Init = Omit<RequestInit, "method" | "body">;

/** Builds `?a=1&b=x`, dropping undefined, null and "" values. Returns "" when empty. */
export function toQueryString(query: ListQuery = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** On a 401 (session expired mid-use), send the browser to the admin login, keeping the current path. */
export function redirectIfExpired(e: unknown): never {
  if (e instanceof ApiError && e.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/admin/login?${new URLSearchParams({ next, reason: "expired" })}`);
  }
  throw e;
}

export const adminGet = <T>(path: string, init?: Init) => api<T>(path, init).catch(redirectIfExpired);
export const adminSend = <T>(method: string, path: string, body?: unknown, init?: Init) =>
  api<T>(path, { ...init, method, body: body === undefined ? undefined : JSON.stringify(body) }).catch(redirectIfExpired);
const get = adminGet;
const send = adminSend;
const list = <T>(path: string, query?: ListQuery, init?: Init) => get<Paginated<T>>(`${path}${toQueryString(query)}`, init);

/** Standard CRUD for `/admin/<resource>` endpoints keyed by numeric id. */
function crud<Item, Detail, Input>(base: string) {
  return {
    list: (query?: ListQuery, init?: Init) => list<Item>(base, query, init),
    get: (id: number, init?: Init) => get<Detail>(`${base}/${id}`, init),
    create: (body: Input, init?: Init) => send<Detail>("POST", base, body, init),
    update: (id: number, body: Partial<Input>, init?: Init) => send<Detail>("PATCH", `${base}/${id}`, body, init),
    remove: (id: number, init?: Init) => send<void>("DELETE", `${base}/${id}`, undefined, init),
  };
}

// Auth calls handle their own 401s (the session gate and the login form), so they skip redirectIfExpired.
export const authApi = {
  me: (init?: Init) => api<{ user: User }>("/auth/me", init),
  adminLogin: (body: { identifier: string; password: string; remember: boolean }) =>
    api<{ user: User }>("/auth/admin/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api<{ ok: true }>("/auth/logout", { method: "POST" }),
};

const enc = encodeURIComponent;

export const adminApi = {
  dashboard: (init?: Init) => get<AdminDashboardStats>("/admin/dashboard", init),

  products: {
    ...crud<AdminProductListItem, AdminProduct, AdminProductInput>("/admin/products"),
    remove: (id: number, init?: Init) =>
      send<{ id: number; deleted: "hard" | "soft" }>("DELETE", `/admin/products/${id}`, undefined, init),
    setStatus: (id: number, isActive: boolean, init?: Init) =>
      send<StatusResult>("PATCH", `/admin/products/${id}/status`, { isActive }, init),
    bulk: (ids: number[], action: BulkProductAction, init?: Init) =>
      send<BulkProductResult>("POST", "/admin/products/bulk", { ids, action }, init),
  },

  categories: {
    ...crud<AdminCategory, AdminCategoryDetail, AdminCategoryInput>("/admin/categories"),
    create: (body: AdminCategoryInput, init?: Init) => send<AdminCategory>("POST", "/admin/categories", body, init),
    update: (id: number, body: Partial<AdminCategoryInput>, init?: Init) =>
      send<AdminCategory>("PATCH", `/admin/categories/${id}`, body, init),
    /** The whole tree, inactive included (not paginated). */
    tree: (init?: Init) => get<CategoryTreeNode[]>("/admin/categories/tree", init),
  },

  orders: {
    list: (query?: ListQuery, init?: Init) => list<AdminOrderListItem>("/admin/orders", query, init),
    get: (orderNumber: string, init?: Init) => get<AdminOrder>(`/admin/orders/${enc(orderNumber)}`, init),
    setStatus: (orderNumber: string, body: { status: OrderStatus; note?: string }, init?: Init) =>
      send<AdminOrder>("PATCH", `/admin/orders/${enc(orderNumber)}/status`, body, init),
  },

  customers: {
    list: (query?: ListQuery, init?: Init) => list<AdminCustomer>("/admin/customers", query, init),
    get: (id: number, init?: Init) => get<AdminCustomerDetail>(`/admin/customers/${id}`, init),
    setStatus: (id: number, isActive: boolean, init?: Init) =>
      send<StatusResult>("PATCH", `/admin/customers/${id}/status`, { isActive }, init),
    setRole: (id: number, role: Role, init?: Init) => send<RoleResult>("PATCH", `/admin/customers/${id}/role`, { role }, init),
  },

  coupons: crud<AdminCouponListItem, AdminCoupon, AdminCouponInput>("/admin/coupons"),

  banners: {
    ...crud<Banner, Banner, AdminBannerInput>("/admin/banners"),
    /** Listed ids get sortOrder 0…n-1; the rest follow in their current order. Returns every banner. */
    reorder: (ids: number[], init?: Init) => send<{ items: Banner[] }>("PUT", "/admin/banners/reorder", { ids }, init),
  },

  settings: {
    get: (init?: Init) => get<StoreSettings>("/admin/settings", init),
    update: (body: StoreSettingsInput, init?: Init) => send<StoreSettings>("PUT", "/admin/settings", body, init),
    pincodes: {
      list: (query?: ListQuery, init?: Init) => list<ServiceablePincode>("/admin/settings/pincodes", query, init),
      create: (body: PincodeInput, init?: Init) => send<ServiceablePincode>("POST", "/admin/settings/pincodes", body, init),
      bulk: (pincodes: PincodeInput[], init?: Init) =>
        send<BulkPincodeResult>("POST", "/admin/settings/pincodes/bulk", { pincodes }, init),
      update: (pincode: string, body: PincodePatch, init?: Init) =>
        send<ServiceablePincode>("PATCH", `/admin/settings/pincodes/${enc(pincode)}`, body, init),
      remove: (pincode: string, init?: Init) => send<void>("DELETE", `/admin/settings/pincodes/${enc(pincode)}`, undefined, init),
    },
  },

  contactMessages: {
    list: (query?: ListQuery, init?: Init) => list<ContactMessage>("/admin/contact-messages", query, init),
    setRead: (id: number, isRead: boolean, init?: Init) =>
      send<ContactMessage>("PATCH", `/admin/contact-messages/${id}`, { isRead }, init),
    remove: (id: number, init?: Init) => send<void>("DELETE", `/admin/contact-messages/${id}`, undefined, init),
  },

  reviews: {
    list: (query?: ListQuery, init?: Init) => list<AdminReview>("/admin/reviews", query, init),
    get: (id: number, init?: Init) => get<AdminReview>(`/admin/reviews/${id}`, init),
    /** 204; the server recomputes the product's rating. */
    remove: (id: number, init?: Init) => send<void>("DELETE", `/admin/reviews/${id}`, undefined, init),
  },

  auditLog: {
    list: (query?: ListQuery, init?: Init) => list<AuditLogEntry>("/admin/audit-log", query, init),
  },
};
