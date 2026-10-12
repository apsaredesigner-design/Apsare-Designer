/**
 * Order helpers (pure): status and payment constants, the CSV export URL and IST
 * date-range helpers shared by the orders list, customer history and audit log.
 *
 *   const url = ordersExportUrl({ status: "PLACED", from: istStartOfDay("2026-09-01") });
 */
import { API_URL } from "@/lib/api";
import { toQueryString } from "../api";
import type { ListQuery, OrderStatus, PaymentMethod } from "../types";

export const ORDER_STATUSES: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
export const PAYMENT_METHODS: PaymentMethod[] = ["COD", "UPI", "CARD", "NET_BANKING"];
export const PAYMENT_METHOD_TEXT: Record<PaymentMethod, string> = { COD: "Cash on delivery", UPI: "UPI", CARD: "Card", NET_BANKING: "Net banking" };

/** URL-synced filter keys of the orders list (also accepted by the CSV export). */
export const ORDER_FILTERS = ["status", "paymentMethod", "paymentStatus", "from", "to"] as const;

export const orderPath = (orderNumber: string) => `/admin/orders/${encodeURIComponent(orderNumber)}`;

/** Absolute URL of the CSV export for the given filters (page/limit are ignored by the server). */
export function ordersExportUrl(query: ListQuery): string {
  return `${API_URL}/admin/orders/export.csv${toQueryString(query)}`;
}

/** `YYYY-MM-DD` (an IST calendar day) → ISO bounds with the +05:30 offset. */
export const istStartOfDay = (ymd: string) => `${ymd}T00:00:00+05:30`;
export const istEndOfDay = (ymd: string) => `${ymd}T23:59:59.999+05:30`;
/** Back from an ISO bound to the `YYYY-MM-DD` shown in a date input. */
export const toDayInput = (iso: string | undefined) => (iso ? iso.slice(0, 10) : "");
