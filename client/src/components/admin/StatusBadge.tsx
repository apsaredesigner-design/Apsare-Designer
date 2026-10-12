/**
 * StatusBadge + Badge: small status pills. Colour is never the only signal: every
 * badge carries a text label (and a dot in the status colour).
 *
 *   <StatusBadge status="SHIPPED" />          // order status
 *   <StatusBadge status="PAID" />             // payment status
 *   <Badge tone="success">Active</Badge>      // anything else
 *   <Badge tone="warning">Low stock</Badge>
 *
 * ORDER_STATUS_COLOR is exported so charts can colour the same status identically.
 */
import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus } from "@/types";
import { cx } from "./styles";

/** One hue per order status (validated for colour-vision deficiency in enum order). */
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PLACED: "#eda100",
  CONFIRMED: "#2a78d6",
  PACKED: "#eb6834",
  SHIPPED: "#4a3aa7",
  OUT_FOR_DELIVERY: "#1baf7a",
  DELIVERED: "#008300",
  CANCELLED: "#e87ba4",
};

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const PAYMENT: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REFUNDED: { label: "Refunded", tone: "info" },
};

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const TONES: Record<BadgeTone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-ink/5 text-ink/70 ring-ink/10", dot: "#8a8a82" },
  success: { pill: "bg-sage-100 text-sage-700 ring-sage-300/60", dot: "#63714a" },
  warning: { pill: "bg-gold-300/25 text-gold-700 ring-gold-400/40", dot: "#c4a052" },
  danger: { pill: "bg-sale/10 text-sale ring-sale/20", dot: "#b4432f" },
  info: { pill: "bg-[#2a78d6]/10 text-[#1f5ea8] ring-[#2a78d6]/20", dot: "#2a78d6" },
  gold: { pill: "bg-ink text-gold-300 ring-ink", dot: "#d4b060" },
};

const pillBase = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset";

export function Badge({ tone = "neutral", dot = true, children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cx(pillBase, t.pill, className)}>
      {dot && <span aria-hidden className="size-1.5 rounded-full" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

function isOrderStatus(s: string): s is OrderStatus {
  return s in ORDER_STATUS_COLOR;
}

export function StatusBadge({ status, className }: { status: OrderStatus | PaymentStatus; className?: string }) {
  if (!isOrderStatus(status)) {
    const p = PAYMENT[status];
    return (
      <Badge tone={p.tone} className={className}>
        {p.label}
      </Badge>
    );
  }
  const color = ORDER_STATUS_COLOR[status];
  return (
    <span
      className={cx(pillBase, "text-ink/85", className)}
      style={{ background: `${color}1f`, ["--tw-ring-color" as string]: `${color}55` }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color }} />
      {ORDER_STATUS_TEXT[status]}
    </span>
  );
}
