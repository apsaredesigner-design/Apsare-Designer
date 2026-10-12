import { prisma } from "../../lib/prisma";
import type { Coupon, Prisma } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";

/**
 * Single source of truth for cart/checkout money maths. The orders module
 * re-prices with these same functions inside its transaction.
 *
 * All maths runs in integer paise; every returned amount is rupees rounded to
 * 2 decimals (a plain `number`), so callers can store it straight into a
 * Decimal(10,2) column. Inputs accept number, numeric string or Prisma Decimal.
 */

/** number | "1499.00" | Prisma.Decimal: anything whose toString() is numeric. */
export type Money = number | string | { toString(): string };

export interface PricingLine {
  mrp: Money;
  salePrice: Money;
  quantity: number;
}

export interface PricingSettings {
  deliveryCharge: Money;
  freeShippingThreshold: Money;
  codFee: Money;
}

export type PricingCoupon = Pick<Coupon, "type" | "value" | "maxDiscount"> | { type: "PERCENT" | "FLAT"; value: Money; maxDiscount: Money | null };

export interface CartSummary {
  /** Σ mrp × qty */
  totalMrp: number;
  /** totalMrp − subtotal (the "discount on MRP" line) */
  discountOnMrp: number;
  /** Σ salePrice × qty: the amount coupons and free shipping are judged on */
  subtotal: number;
  couponDiscount: number;
  /** 0 when subtotal ≥ freeShippingThreshold (or the cart is empty) */
  deliveryCharge: number;
  /** Present only when `opts.cod` is true */
  codFee?: number;
  /** subtotal − couponDiscount + deliveryCharge (+ codFee) */
  total: number;
  /** How much more (on subtotal) unlocks free shipping; 0 when already free */
  freeShippingRemaining: number;
}

/** An interactive-transaction client. The one Tx alias the modules share. */
export type Tx = Prisma.TransactionClient;
/** Either the root client or a transaction: for helpers usable both ways. */
export type Db = Tx | typeof prisma;

export const toPaise = (v: Money): number => Math.round(Number(v.toString()) * 100);
export const toRupees = (paise: number): number => Math.round(paise) / 100;

/** Coupon discount in paise for a subtotal in paise. Never exceeds the subtotal. */
function couponDiscountPaise(coupon: PricingCoupon, subtotalPaise: number): number {
  let d = coupon.type === "PERCENT" ? Math.floor((subtotalPaise * Number(coupon.value.toString())) / 100) : toPaise(coupon.value);
  if (coupon.maxDiscount != null) d = Math.min(d, toPaise(coupon.maxDiscount));
  return Math.max(0, Math.min(d, subtotalPaise));
}

/** Coupon discount in rupees for a subtotal in rupees. */
export function computeCouponDiscount(coupon: PricingCoupon, subtotal: Money): number {
  return toRupees(couponDiscountPaise(coupon, toPaise(subtotal)));
}

/**
 * Free shipping is judged on `subtotal` (sale-price total, before the coupon).
 * Pass only lines that are actually purchasable (the cart route excludes
 * unavailable ones).
 */
export function computeCartSummary(
  items: PricingLine[],
  settings: PricingSettings,
  coupon?: PricingCoupon | null,
  opts: { cod?: boolean } = {},
): CartSummary {
  let mrp = 0;
  let sub = 0;
  for (const i of items) {
    mrp += toPaise(i.mrp) * i.quantity;
    sub += toPaise(i.salePrice) * i.quantity;
  }
  const couponD = coupon && sub > 0 ? couponDiscountPaise(coupon, sub) : 0;
  const threshold = toPaise(settings.freeShippingThreshold);
  const free = sub === 0 || sub >= threshold;
  const delivery = free ? 0 : toPaise(settings.deliveryCharge);
  const cod = opts.cod && sub > 0 ? toPaise(settings.codFee) : 0;
  return {
    totalMrp: toRupees(mrp),
    discountOnMrp: toRupees(Math.max(0, mrp - sub)),
    subtotal: toRupees(sub),
    couponDiscount: toRupees(couponD),
    deliveryCharge: toRupees(delivery),
    ...(opts.cod ? { codFee: toRupees(cod) } : {}),
    total: toRupees(sub - couponD + delivery + cod),
    freeShippingRemaining: sub === 0 ? toRupees(threshold) : toRupees(Math.max(0, threshold - sub)),
  };
}

/** The StoreSetting singleton (id=1); falls back to schema defaults if missing. */
export async function getStoreSettings(tx: Db = prisma): Promise<PricingSettings> {
  const s = await tx.storeSetting.findUnique({ where: { id: 1 } });
  return s ?? { deliveryCharge: 99, freeShippingThreshold: 1999, codFee: 0 };
}

/** The one message for unknown, inactive, not-started and expired coupons. */
export const INVALID_COUPON = "Invalid or expired coupon";

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Looks up `code` (case-insensitive: codes are stored upper-case) and checks it
 * against `subtotal` (rupees, computed server-side) and `userId`'s order history.
 * Returns the Coupon row or throws HttpError 400 (code COUPON_INVALID) with a
 * user-facing reason. Unknown, inactive, not-yet-started and expired codes all
 * get the same generic message, so codes cannot be probed; the usage-limit,
 * per-customer, first-order and minimum-order reasons are specific. Cancelled
 * orders never count. Pass `tx` inside a transaction (orders).
 */
export async function validateCoupon(code: string, subtotal: Money, userId: number, tx: Db = prisma): Promise<Coupon> {
  const normalized = code.trim().toUpperCase();
  const fail = (msg: string) => new HttpError(400, msg, "COUPON_INVALID", [{ path: "code", message: msg }]);
  if (!normalized) throw fail("Enter a coupon code");

  const coupon = await tx.coupon.findUnique({ where: { code: normalized } });
  const now = new Date();
  if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt <= now)) {
    throw fail(INVALID_COUPON);
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw fail(`Coupon ${normalized} has reached its usage limit`);
  if (coupon.firstOrderOnly || coupon.perUserLimit != null) {
    const placed = { userId, status: { not: "CANCELLED" as const } };
    if (coupon.firstOrderOnly && (await tx.order.count({ where: placed, take: 1 }))) {
      throw fail(`Coupon ${normalized} is only valid on your first order`);
    }
    if (coupon.perUserLimit != null && (await tx.order.count({ where: { ...placed, couponId: coupon.id } })) >= coupon.perUserLimit) {
      throw fail(`You have already used coupon ${normalized} the maximum number of times`);
    }
  }
  const min = toPaise(coupon.minOrderAmount);
  const sub = toPaise(subtotal);
  if (sub < min) throw fail(`Add items worth ${inr(min - sub)} more to use ${normalized} (minimum order ${inr(min)})`);
  return coupon;
}
