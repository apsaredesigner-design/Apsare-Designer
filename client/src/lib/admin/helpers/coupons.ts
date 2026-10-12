/**
 * Coupon helpers (pure): the derived state (live / scheduled / expired / inactive),
 * the server's limits, form <-> body mapping and client-side validation.
 *
 *   const state = couponState(coupon, Date.now());
 *   const issues = validateCouponForm(values);   // {} when valid
 *   await adminApi.coupons.create(toCouponBody(values));
 */
import type { AdminCoupon, AdminCouponInput, CouponType } from "../types";

export type CouponState = "live" | "scheduled" | "expired" | "inactive";

export const MAX_PERCENT = 90;
export const MAX_FLAT = 100_000;
export const MAX_USAGE_LIMIT = 10_000_000;
export const MAX_PER_USER_LIMIT = 1000;

export function couponState(c: Pick<AdminCoupon, "isActive" | "startsAt" | "expiresAt">, now: number): CouponState {
  if (!c.isActive) return "inactive";
  if (c.expiresAt && Date.parse(c.expiresAt) <= now) return "expired";
  if (c.startsAt && Date.parse(c.startsAt) > now) return "scheduled";
  return "live";
}

/** Form values: numbers and datetimes as the raw input strings. */
export interface CouponForm {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minOrderAmount: string;
  usageLimit: string;
  perUserLimit: string;
  firstOrderOnly: boolean;
  startsAt: string; // datetime-local, IST
  expiresAt: string;
  isActive: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → `YYYY-MM-DDTHH:mm` in IST for a datetime-local input. */
export function toIstLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(Date.parse(iso) + 330 * 60_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
/** datetime-local (IST) → ISO with offset, or null when empty. */
export const fromIstLocalInput = (v: string) => (v ? `${v}:00+05:30` : null);

export function couponToForm(c?: AdminCoupon): CouponForm {
  return {
    code: c?.code ?? "",
    description: c?.description ?? "",
    type: c?.type ?? "PERCENT",
    value: c ? String(c.value) : "",
    maxDiscount: c?.maxDiscount != null ? String(c.maxDiscount) : "",
    minOrderAmount: c ? String(c.minOrderAmount) : "0",
    usageLimit: c?.usageLimit != null ? String(c.usageLimit) : "",
    perUserLimit: c?.perUserLimit != null ? String(c.perUserLimit) : "",
    firstOrderOnly: c?.firstOrderOnly ?? false,
    startsAt: toIstLocalInput(c?.startsAt ?? null),
    expiresAt: toIstLocalInput(c?.expiresAt ?? null),
    isActive: c?.isActive ?? true,
  };
}

const isInt = (v: string) => /^\d+$/.test(v.trim());
const intOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

/** Client-side checks mirroring the server rules. Keys match the API field names. */
export function validateCouponForm(f: CouponForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!/^[A-Z0-9_-]{3,30}$/.test(f.code.trim())) e.code = "3–30 letters, digits, _ or -";
  if (!isInt(f.value) || Number(f.value) <= 0) e.value = "Enter a whole number above 0";
  else if (f.type === "PERCENT" && Number(f.value) > MAX_PERCENT) e.value = `Percent coupons are capped at ${MAX_PERCENT}%`;
  else if (f.type === "FLAT" && Number(f.value) > MAX_FLAT) e.value = "Flat coupons are capped at ₹1,00,000";
  if (f.type === "PERCENT" && f.maxDiscount.trim() && (!isInt(f.maxDiscount) || Number(f.maxDiscount) <= 0)) e.maxDiscount = "Enter a whole number above 0";
  if (!isInt(f.minOrderAmount || "0")) e.minOrderAmount = "Enter a whole number (0 for none)";
  if (f.usageLimit.trim() && (!isInt(f.usageLimit) || Number(f.usageLimit) < 1 || Number(f.usageLimit) > MAX_USAGE_LIMIT)) e.usageLimit = "1 to 1,00,00,000, or blank";
  if (f.perUserLimit.trim() && (!isInt(f.perUserLimit) || Number(f.perUserLimit) < 1 || Number(f.perUserLimit) > MAX_PER_USER_LIMIT)) e.perUserLimit = "1 to 1,000, or blank";
  if (f.startsAt && f.expiresAt && f.startsAt >= f.expiresAt) e.expiresAt = "Must be after the start";
  if (f.description.length > 300) e.description = "At most 300 characters";
  return e;
}

export function toCouponBody(f: CouponForm): AdminCouponInput {
  return {
    code: f.code.trim().toUpperCase(),
    description: f.description.trim() || null,
    type: f.type,
    value: Number(f.value),
    maxDiscount: f.type === "PERCENT" ? intOrNull(f.maxDiscount) : null,
    minOrderAmount: Number(f.minOrderAmount || 0),
    usageLimit: intOrNull(f.usageLimit),
    perUserLimit: intOrNull(f.perUserLimit),
    firstOrderOnly: f.firstOrderOnly,
    startsAt: fromIstLocalInput(f.startsAt),
    expiresAt: fromIstLocalInput(f.expiresAt),
    isActive: f.isActive,
  };
}
