/** Coupon state badge and short human descriptions of the discount and validity. */
import { Badge, type BadgeTone } from "@/components/admin/StatusBadge";
import { formatDateTime, formatINR, formatNumber } from "@/lib/admin/format";
import type { CouponState } from "@/lib/admin/helpers/coupons";
import type { AdminCouponListItem } from "@/lib/admin/types";

const STATE: Record<CouponState, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  expired: { label: "Expired", tone: "neutral" },
  inactive: { label: "Inactive", tone: "danger" },
};

export const CouponStateBadge = ({ state }: { state: CouponState }) => <Badge tone={STATE[state].tone}>{STATE[state].label}</Badge>;

export function discountText(c: AdminCouponListItem): string {
  if (c.type === "FLAT") return `${formatINR(c.value)} off`;
  return `${c.value}% off${c.maxDiscount ? `, up to ${formatINR(c.maxDiscount)}` : ""}`;
}

export function usageText(c: AdminCouponListItem): string {
  return `${formatNumber(c.usedCount)} / ${c.usageLimit ? formatNumber(c.usageLimit) : "∞"}`;
}

export function windowText(c: AdminCouponListItem): string {
  if (!c.startsAt && !c.expiresAt) return "Always";
  if (!c.expiresAt) return `From ${formatDateTime(c.startsAt!)}`;
  if (!c.startsAt) return `Until ${formatDateTime(c.expiresAt)}`;
  return `${formatDateTime(c.startsAt)} – ${formatDateTime(c.expiresAt)}`;
}
