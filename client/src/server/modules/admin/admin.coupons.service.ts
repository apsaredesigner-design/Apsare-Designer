import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError, type ErrorDetail } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { CouponInput, CreateInput, ListQuery } from "./admin.coupons.schemas";
import { toOrderBy } from "./admin.shared";

// /api/admin/coupons logic (extracted from server admin.coupons.ts).

const MAX_PERCENT = 90;
const MAX_FLAT = 100_000;

/** Rules that span fields; run on the merged (stored + incoming) values for updates. */
export function couponIssues(c: CouponInput): ErrorDetail[] {
  const issues: ErrorDetail[] = [];
  if (c.type === "PERCENT" && c.value !== undefined && c.value > MAX_PERCENT) {
    issues.push({ path: "body.value", message: `Percent coupons are capped at ${MAX_PERCENT}` });
  }
  if (c.type === "FLAT" && c.value !== undefined && c.value > MAX_FLAT) {
    issues.push({ path: "body.value", message: `Flat coupons are capped at ${MAX_FLAT}` });
  }
  if (c.type === "FLAT" && c.maxDiscount != null) {
    issues.push({ path: "body.maxDiscount", message: "maxDiscount only applies to PERCENT coupons" });
  }
  if (c.startsAt && c.expiresAt && c.startsAt >= c.expiresAt) {
    issues.push({ path: "body.expiresAt", message: "expiresAt must be after startsAt" });
  }
  return issues;
}
function assertValid(c: CouponInput) {
  const issues = couponIssues(c);
  if (issues.length) throw new HttpError(400, "Validation failed", "VALIDATION_ERROR", issues);
}

export async function listCoupons(q: ListQuery) {
  const now = new Date();
  const and: Prisma.CouponWhereInput[] = [];
  if (q.q) and.push({ OR: [{ code: { contains: q.q, mode: "insensitive" } }, { description: { contains: q.q, mode: "insensitive" } }] });
  if (q.type) and.push({ type: q.type });
  if (q.isActive !== undefined) and.push({ isActive: q.isActive });
  if (q.state === "expired") and.push({ expiresAt: { lte: now } });
  if (q.state === "scheduled") and.push({ startsAt: { gt: now } });
  if (q.state === "live") {
    and.push(
      { isActive: true },
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    );
  }
  const where: Prisma.CouponWhereInput = and.length ? { AND: and } : {};
  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      // MySQL sorts NULL first ascending; fine for "expiring soonest" as "no expiry" is rare
      orderBy: [toOrderBy(q.sort), { id: "desc" }],
      ...toSkipTake(q),
      include: { _count: { select: { orders: true } } },
    }),
    prisma.coupon.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

export async function getCoupon(id: number) {
  const coupon = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!coupon) throw new HttpError(404, "Coupon not found");
  return coupon;
}

/** The route answers 201. A duplicate code → P2002 → 409. */
export async function createCoupon(body: CreateInput) {
  assertValid(body);
  return prisma.coupon.create({ data: body });
}

export async function updateCoupon(id: number, body: CouponInput) {
  const current = await prisma.coupon.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, "Coupon not found");
  assertValid({
    type: body.type ?? current.type,
    value: body.value ?? current.value.toNumber(),
    maxDiscount: body.maxDiscount !== undefined ? body.maxDiscount : current.maxDiscount?.toNumber(),
    startsAt: body.startsAt !== undefined ? body.startsAt : current.startsAt,
    expiresAt: body.expiresAt !== undefined ? body.expiresAt : current.expiresAt,
  });
  return prisma.coupon.update({ where: { id }, data: body });
}

/** Coupons already used on orders are kept for history: 409, deactivate instead. The route answers 204. */
export async function deleteCoupon(id: number): Promise<void> {
  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { _count: { select: { orders: true } } } });
  if (!coupon) throw new HttpError(404, "Coupon not found");
  if (coupon._count.orders) throw new HttpError(409, "Coupon has been used on orders; deactivate it instead", "COUPON_IN_USE");
  await prisma.coupon.delete({ where: { id } });
}
