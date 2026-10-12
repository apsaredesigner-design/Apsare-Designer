import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { Prisma, type Order, type OrderItem, type OrderStatus } from "../../../generated/prisma/client";
import { HttpError, type ErrorDetail } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import { computeCartSummary, getStoreSettings, validateCoupon, type Tx } from "../cart/cart.pricing";
import { providerForMethod, type PaymentMethod } from "../payments/provider";
import { isPurchasable, visibleCategoryIds } from "../products/products.service";
import { notifyOrderPlaced, notifyOrderStatus, notifyAdminNewOrder } from "./orders.emails";
import { assertTransition, CANCELLABLE_STATUSES } from "./orders.status";

export interface PlaceOrderInput {
  addressId: number;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

/** What the detail endpoint returns (and POST / returns on success). */
export const orderDetailInclude = {
  items: { orderBy: { id: "asc" } },
  statusHistory: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  payments: {
    orderBy: { createdAt: "asc" },
    select: { id: true, provider: true, providerRef: true, amount: true, status: true, createdAt: true },
  },
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude;

// ─── Order number ─────────────────────────────────────────────

/** No 0/O/1/I/L so numbers read out over the phone are unambiguous. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** APS-YYMMDD-XXXXX (IST date, 5 random chars ≈ 28.6M per day). */
export function generateOrderNumber(now = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const ymd = ist.toISOString().slice(2, 10).replaceAll("-", "");
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `APS-${ymd}-${suffix}`;
}

async function uniqueOrderNumber(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateOrderNumber();
    const clash = await tx.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new HttpError(500, "Could not allocate an order number, please retry", "INTERNAL");
}

// ─── Place order ──────────────────────────────────────────────

/**
 * `Idempotency-Key` support, stored on the order (`Order.idempotencyKey` =
 * `${userId}:${key}`, unique), so it survives restarts and works across server
 * instances. A retry with the same key returns the original order with
 * `replayed: true` instead of placing a second one. A failed attempt stores
 * nothing, so it may be retried with the same key. Concurrent attempts are
 * serialised by the user row lock in placeOrderTx; a unique-index race (P2002)
 * still resolves to the existing order.
 */
export async function placeOrder(userId: number, input: PlaceOrderInput, idempotencyKey?: string) {
  if (!idempotencyKey) {
    const orderNumber = (await placeOrderTx(userId, input)).orderNumber;
    notifyOrderPlaced(orderNumber);
    return getOrderDetail(userId, orderNumber);
  }

  const key = `${userId}:${idempotencyKey}`;
  const replay = async () => {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey: key }, select: { orderNumber: true } });
    return existing && { ...(await getOrderDetail(userId, existing.orderNumber)), replayed: true };
  };
  const previous = await replay();
  if (previous) return previous;

  try {
    const { orderNumber, replayed } = await placeOrderTx(userId, input, key);
    if (!replayed) notifyOrderPlaced(orderNumber);
    return { ...(await getOrderDetail(userId, orderNumber)), replayed };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await replay();
      if (raced) return raced;
    }
    throw err;
  }
}

/**
 * Everything happens in one interactive transaction; any throw rolls it all back.
 * Returns the orderNumber, or the existing order's number (`replayed`) when
 * `idempotencyKey` was already used.
 */
async function placeOrderTx(userId: number, input: PlaceOrderInput, idempotencyKey?: string): Promise<{ orderNumber: string; replayed: boolean }> {
  // Throws 400 PAYMENT_METHOD_UNAVAILABLE for UPI/CARD/NET_BANKING until a gateway is registered.
  const provider = providerForMethod(input.paymentMethod);
  const isCod = input.paymentMethod === "COD";
  const visible = await visibleCategoryIds();

  const result = await prisma.$transaction(
    async (tx) => {
      // 0. Lock my user row: serialises my concurrent checkouts (idempotency key,
      //    per-customer coupon rules) and refuses an account disabled mid-request.
      const [me] = await tx.$queryRaw<{ isActive: number | boolean }[]>`SELECT "isActive" FROM "User" WHERE id = ${userId} FOR UPDATE`;
      if (!me || !Number(me.isActive)) throw new HttpError(403, "This account has been disabled", "ACCOUNT_DISABLED");
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({ where: { idempotencyKey }, select: { orderNumber: true } });
        if (existing) return { orderNumber: existing.orderNumber, replayed: true };
      }

      // 1. Address must be mine and deliverable.
      const address = await tx.address.findFirst({ where: { id: input.addressId, userId } });
      if (!address) throw new HttpError(404, "Address not found");
      const pin = await tx.serviceablePincode.findUnique({ where: { pincode: address.pincode } });
      if (!pin) {
        throw new HttpError(400, `We do not deliver to pincode ${address.pincode} yet`, "PINCODE_NOT_SERVICEABLE", [
          { path: "addressId", message: "Pincode not serviceable" },
        ]);
      }
      if (isCod && !pin.codAvailable) {
        throw new HttpError(400, `Cash on Delivery is not available for pincode ${address.pincode}`, "COD_NOT_AVAILABLE", [
          { path: "paymentMethod", message: "COD not available for this pincode" },
        ]);
      }

      // 2. Load the cart and re-price from the DB (client prices are never trusted).
      const cart = await tx.cartItem.findMany({
        where: { userId },
        orderBy: { variantId: "asc" }, // stable lock order → fewer deadlocks between concurrent orders
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true, name: true, code: true, mrp: true, salePrice: true, isActive: true, categoryId: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
                },
              },
            },
          },
        },
      });
      if (cart.length === 0) throw new HttpError(400, "Your cart is empty", "CART_EMPTY");

      // 3. Every product must still be purchasable (active, in a visible category):
      //    409 PRODUCT_UNAVAILABLE listing them, before any stock is touched.
      const label = (v: (typeof cart)[number]["variant"]) => `${v.product.name} (${v.size}, ${v.color})`;
      const hidden: ErrorDetail[] = cart
        .filter((i) => !isPurchasable(i.variant.product, visible))
        .map((i) => ({ path: `variant.${i.variant.id}`, message: `${label(i.variant)} is no longer available` }));
      if (hidden.length) {
        throw new HttpError(409, "Some items in your cart are no longer available", "PRODUCT_UNAVAILABLE", hidden);
      }

      // 4. Reserve stock atomically: only decrements when enough is left, so two
      //    concurrent orders can never both take the last unit.
      const unavailable: ErrorDetail[] = [];
      for (const item of cart) {
        const { variant } = item;
        const { count } = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (count === 0) {
          const fresh = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
          const left = fresh?.stock ?? 0;
          unavailable.push({
            path: `variant.${variant.id}`,
            message: left > 0 ? `${label(variant)}: only ${left} left` : `${label(variant)} is out of stock`,
          });
        }
      }
      if (unavailable.length) {
        throw new HttpError(409, "Some items in your cart are out of stock", "OUT_OF_STOCK", unavailable);
      }

      // 5. Price it, then validate + claim the coupon.
      const settings = await getStoreSettings(tx);
      const lines = cart.map((i) => ({ mrp: i.variant.product.mrp, salePrice: i.variant.product.salePrice, quantity: i.quantity }));
      let coupon = null;
      if (input.couponCode) {
        const base = computeCartSummary(lines, settings, null, { cod: isCod });
        coupon = await validateCoupon(input.couponCode, base.subtotal, userId, tx);
        // Conditional increment so concurrent orders cannot exceed usageLimit.
        const { count } = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            ...(coupon.usageLimit != null ? { usedCount: { lt: coupon.usageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (count === 0) {
          throw new HttpError(400, `Coupon ${coupon.code} has reached its usage limit`, "COUPON_INVALID", [
            { path: "couponCode", message: "Usage limit reached" },
          ]);
        }
      }
      const summary = computeCartSummary(lines, settings, coupon, { cod: isCod });

      // 6. Create the order with address + item snapshots and the first history entry.
      const orderNumber = await uniqueOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          paymentMethod: input.paymentMethod,
          totalMrp: summary.totalMrp,
          totalDiscount: summary.discountOnMrp,
          couponId: coupon?.id ?? null,
          couponDiscount: summary.couponDiscount,
          // No separate COD-fee column: it is folded into deliveryCharge.
          deliveryCharge: summary.deliveryCharge + (summary.codFee ?? 0),
          finalAmount: summary.total,
          shipName: address.fullName,
          shipMobile: address.mobile,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipLandmark: address.landmark,
          shipCity: address.city,
          shipState: address.state,
          shipPincode: address.pincode,
          idempotencyKey: idempotencyKey ?? null,
          items: {
            create: cart.map((i) => ({
              variantId: i.variantId,
              productName: i.variant.product.name,
              productCode: i.variant.product.code,
              imageUrl: i.variant.product.images[0]?.url ?? null,
              size: i.variant.size,
              color: i.variant.color,
              mrp: i.variant.product.mrp,
              salePrice: i.variant.product.salePrice,
              quantity: i.quantity,
            })),
          },
          statusHistory: { create: { status: "PLACED", note: "Order placed" } },
        },
        select: { id: true },
      });

      // 7. Payment record via the provider. NOTE: once a real gateway is added, its
      //    network call should move out of this DB transaction (create order → commit → call gateway).
      const payment = await provider.createPayment({ orderId: order.id, amount: summary.total, method: input.paymentMethod });
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: provider.name,
          providerRef: payment.providerRef ?? null,
          amount: summary.total,
          status: payment.status,
          raw: (payment.clientPayload as Prisma.InputJsonValue | undefined) ?? undefined,
        },
      });
      if (payment.status !== "PENDING") {
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: payment.status } });
      }

      // 8. Popularity + empty the cart.
      const soldByProduct = new Map<number, number>();
      for (const i of cart) soldByProduct.set(i.variant.product.id, (soldByProduct.get(i.variant.product.id) ?? 0) + i.quantity);
      for (const [productId, qty] of soldByProduct) {
        await tx.product.update({ where: { id: productId }, data: { soldCount: { increment: qty } } });
      }
      await tx.cartItem.deleteMany({ where: { userId } });

      return { orderNumber, replayed: false };
    },
    { maxWait: 5_000, timeout: 15_000 },
  );
  
  notifyOrderPlaced(result.orderNumber);
  notifyAdminNewOrder(result.orderNumber);
  return result;
}

// ─── Read ─────────────────────────────────────────────────────

export async function listOrders(userId: number, q: { page: number; limit: number; status?: OrderStatus }) {
  const where: Prisma.OrderWhereInput = { userId, ...(q.status ? { status: q.status } : {}) };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toSkipTake(q),
      select: {
        id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true,
        finalAmount: true, createdAt: true, updatedAt: true,
        items: {
          orderBy: { id: "asc" },
          select: { id: true, productName: true, imageUrl: true, size: true, color: true, quantity: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);
  const items = rows.map((o) => ({ ...o, itemCount: o.items.reduce((n, i) => n + i.quantity, 0) }));
  return paginated(items, total, q.page, q.limit);
}

/** Someone else's order is indistinguishable from a missing one (404). */
export async function getOrderDetail(userId: number, orderNumber: string) {
  const order = await prisma.order.findFirst({ where: { orderNumber, userId }, include: orderDetailInclude });
  if (!order) throw new HttpError(404, "Order not found");
  return order;
}

// ─── Cancel ───────────────────────────────────────────────────

type CancellableOrder = Pick<Order, "id" | "status" | "paymentStatus" | "couponId"> & { items: Pick<OrderItem, "variantId" | "quantity">[] };

/**
 * Cancels `order` inside `tx`. Shared by the customer cancel and the admin
 * status update. The caller has already checked the transition. Claims the
 * order with a conditional update on its current status (a concurrent change
 * gives 409 instead of a double restock), then restocks the variants that
 * still exist, reverses soldCount and the coupon use, sets payments
 * PAID → REFUNDED / PENDING → FAILED (and the order's paymentStatus to match)
 * and appends a CANCELLED history entry with `note`.
 */
export async function cancelOrderTx(tx: Tx, order: CancellableOrder, { note, actor }: { note: string | null; actor: "customer" | "admin" }) {
  // A paid order is refunded; an unpaid one simply fails.
  const paymentStatus = order.paymentStatus === "PAID" ? "REFUNDED" : "FAILED";

  // Conditional update = claim: a concurrent cancel/admin update cannot double-restock.
  const { count } = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: "CANCELLED", paymentStatus },
  });
  if (count === 0) {
    throw new HttpError(409, "Order status changed, please refresh", actor === "customer" ? "ORDER_NOT_CANCELLABLE" : "INVALID_STATUS_TRANSITION");
  }

  const soldByProduct = new Map<number, number>();
  for (const item of order.items) {
    // Variant may have been deleted by an admin since; restock what still exists.
    const { count: restocked } = await tx.productVariant.updateMany({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    if (restocked) {
      const v = await tx.productVariant.findUnique({ where: { id: item.variantId }, select: { productId: true } });
      if (v) soldByProduct.set(v.productId, (soldByProduct.get(v.productId) ?? 0) + item.quantity);
    }
  }
  for (const [productId, qty] of soldByProduct) {
    await tx.product.updateMany({ where: { id: productId, soldCount: { gte: qty } }, data: { soldCount: { decrement: qty } } });
  }
  if (order.couponId) {
    await tx.coupon.updateMany({ where: { id: order.couponId, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
  }

  // TODO(gateway): trigger the actual refund through the provider before marking REFUNDED.
  await tx.payment.updateMany({ where: { orderId: order.id, status: "PAID" }, data: { status: "REFUNDED" } });
  await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED" } });
  await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "CANCELLED", note } });
}

export async function cancelOrder(userId: number, orderNumber: string, reason?: string) {
  const { oldStatus } = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { orderNumber, userId }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new HttpError(409, `Order cannot be cancelled once it is ${order.status.toLowerCase().replaceAll("_", " ")}`, "ORDER_NOT_CANCELLABLE");
    }
    assertTransition(order.status, "CANCELLED");
    await cancelOrderTx(tx, order, { note: reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer", actor: "customer" });
    return { oldStatus: order.status };
  });
  notifyOrderStatus(orderNumber, "CANCELLED", oldStatus, reason ? `Cancelled by customer: ${reason}` : undefined);
  return getOrderDetail(userId, orderNumber);
}

// ─── HTTP-adjacent helpers (extracted from server orders.routes.ts) ─────

/**
 * The optional `Idempotency-Key` header of POST /api/orders, trimmed. Pass
 * the incoming `idempotency-key` request header (`ctx.req` headers). Missing or blank → undefined;
 * otherwise 8–128 characters or 400 VALIDATION_ERROR (`headers.idempotency-key`).
 */
export function parseIdempotencyKey(header: string | null | undefined): string | undefined {
  const key = header?.trim();
  if (key !== undefined && (key.length < 8 || key.length > 128)) {
    throw new HttpError(400, "Idempotency-Key must be 8–128 characters", "VALIDATION_ERROR", [
      { path: "headers.idempotency-key", message: "Must be 8–128 characters" },
    ]);
  }
  return key || undefined;
}

/** Status for POST /api/orders: 200 when an idempotent replay returned the existing order, else 201. */
export function placeOrderStatus(result: Awaited<ReturnType<typeof placeOrder>>): 200 | 201 {
  const replayed = "replayed" in result && result.replayed;
  return replayed ? 200 : 201;
}
