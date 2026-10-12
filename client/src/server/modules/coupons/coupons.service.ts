import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { computeCouponDiscount } from "../cart/cart.pricing";
import { loadCart, publicCoupon } from "../cart/cart.service";

/**
 * Active, started, unexpired, not used up coupons with a description, cheapest
 * minimum first. With a user, coupons they can no longer use (first-order-only
 * after their first order, per-customer limit reached) are left out, and each
 * also gets `eligible` / `amountNeeded` / `discount` against their current cart.
 */
export async function listAvailableCoupons(userId?: number) {
  const now = new Date();
  const rows = await prisma.coupon.findMany({
    where: {
      isActive: true,
      description: { not: null },
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
    },
    orderBy: { minOrderAmount: "asc" },
  });
  let usable = rows.filter((c) => c.usageLimit == null || c.usedCount < c.usageLimit);
  if (userId) {
    const used = await prisma.order.groupBy({
      by: ["couponId"],
      where: { userId, status: { not: "CANCELLED" } },
      _count: { _all: true },
    });
    const hasOrder = used.length > 0;
    const usedBy = new Map(used.map((u) => [u.couponId, u._count._all]));
    usable = usable.filter(
      (c) => !(c.firstOrderOnly && hasOrder) && (c.perUserLimit == null || (usedBy.get(c.id) ?? 0) < c.perUserLimit),
    );
  }

  const subtotal = userId ? (await loadCart(userId)).summary.subtotal : null;
  const items = usable.map((c) => {
    const pub = publicCoupon(c);
    if (subtotal == null) return pub;
    const amountNeeded = Math.max(0, Math.round((pub.minOrderAmount - subtotal) * 100) / 100);
    const eligible = subtotal > 0 && amountNeeded === 0;
    return { ...pub, eligible, amountNeeded, discount: eligible ? computeCouponDiscount(c, subtotal) : 0 };
  });
  return { items, subtotal };
}

/** Preview of `code` against the user's CURRENT server-side cart. 400 COUPON_INVALID with the reason. */
export async function applyCoupon(userId: number, code: string) {
  // loadCart runs validateCoupon on the server-computed subtotal and reports the reason as couponError.
  const priced = await loadCart(userId, code);
  if (priced.couponError) throw new HttpError(400, priced.couponError, "COUPON_INVALID", [{ path: "code", message: priced.couponError }]);
  return { coupon: priced.coupon!, discount: priced.summary.couponDiscount, summary: priced.summary };
}
