import type { OrderStatus, Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import { notifyOrderStatus } from "../orders/orders.emails";
import { cancelOrderTx, orderDetailInclude } from "../orders/orders.service";
import { assertTransition, ORDER_TRANSITIONS } from "../orders/orders.status";
import type { ListQuery } from "./admin.orders.schemas";
import { toOrderBy } from "./admin.shared";

// /api/admin/orders logic (extracted from server admin.orders.ts).

const userSelect = { select: { id: true, fullName: true, email: true, mobile: true } } as const;

/** End of day for a bare date, so `to=2026-09-26` includes that whole day. */
function toDate(v: string, endOfDay: boolean): Date {
  const d = new Date(v);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(v)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

/** Detail plus `nextStatuses`: the statuses the admin may move it to now (for the action buttons). null if unknown. */
export async function getDetail(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { ...orderDetailInclude, user: userSelect } });
  return order && { ...order, nextStatuses: ORDER_TRANSITIONS[order.status] };
}

function listWhere(q: Omit<ListQuery, "page" | "limit" | "sort">): Prisma.OrderWhereInput {
  return {
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
    ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
    ...(q.from || q.to
      ? { createdAt: { ...(q.from ? { gte: toDate(q.from, false) } : {}), ...(q.to ? { lte: toDate(q.to, true) } : {}) } }
      : {}),
    ...(q.q
      ? {
          OR: [
            { orderNumber: { contains: q.q, mode: "insensitive" } },
            { shipName: { contains: q.q, mode: "insensitive" } },
            { user: { fullName: { contains: q.q, mode: "insensitive" } } },
            { user: { email: { contains: q.q, mode: "insensitive" } } },
            { user: { mobile: { contains: q.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listOrders(q: ListQuery) {
  const where = listWhere(q);
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [toOrderBy(q.sort), { id: "desc" }],
      ...toSkipTake(q),
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        finalAmount: true,
        shipName: true,
        shipCity: true,
        shipPincode: true,
        createdAt: true,
        updatedAt: true,
        user: userSelect,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

// ─── CSV export ─────────────────────────────────────────────────

const CSV_COLUMNS = [
  "orderNumber", "createdAt", "status", "paymentMethod", "paymentStatus", "customerName", "customerEmail", "customerMobile",
  "items", "totalMrp", "totalDiscount", "coupon", "couponDiscount", "deliveryCharge", "finalAmount",
  "shipName", "shipMobile", "shipCity", "shipState", "shipPincode",
] as const;
const EXPORT_BATCH = 500;

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starting with
 * = + - @, tab or CR) is prefixed with `'`; cells with a comma, quote or line
 * break are quoted. Numbers and dates are written as-is.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * GET /orders/export.csv: a streamed `text/csv` Response of every matching order, fetched
 * in batches of 500 (no paging, no size cap). Return it from the handler as is. Express
 * wrote with backpressure (`drain`) and stopped when the client went away; here the
 * stream pulls a batch only when the consumer wants more and stops on cancel. A failure
 * mid-stream errors the stream (the connection is cut), as Express did after headersSent.
 */
export function exportOrdersCsv(q: Omit<ListQuery, "page" | "limit">): Response {
  const where = listWhere(q);
  const stamp = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();
  let skip = 0;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`﻿${CSV_COLUMNS.join(",")}\r\n`)); // BOM so Excel reads UTF-8 (₹, names)
    },
    async pull(controller) {
      const rows = await prisma.order.findMany({
        where,
        orderBy: [toOrderBy(q.sort), { id: "desc" }],
        skip,
        take: EXPORT_BATCH,
        include: {
          user: { select: { fullName: true, email: true, mobile: true } },
          coupon: { select: { code: true } },
          items: { select: { quantity: true } },
        },
      });
      skip += EXPORT_BATCH;
      const chunk = rows.map((o) =>
        [
          o.orderNumber, o.createdAt, o.status, o.paymentMethod, o.paymentStatus, o.user.fullName, o.user.email, o.user.mobile,
          o.items.reduce((n, i) => n + i.quantity, 0), o.totalMrp, o.totalDiscount, o.coupon?.code, o.couponDiscount,
          o.deliveryCharge, o.finalAmount, o.shipName, o.shipMobile, o.shipCity, o.shipState, o.shipPincode,
        ]
          .map(csvCell)
          .join(","),
      );
      if (chunk.length) controller.enqueue(encoder.encode(chunk.join("\r\n") + "\r\n"));
      if (rows.length < EXPORT_BATCH) controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** GET /orders/:orderNumber. */
export async function getOrderOr404(orderNumber: string) {
  const order = await getDetail(orderNumber);
  if (!order) throw new HttpError(404, "Order not found");
  return order;
}

/**
 * Moves an order along ORDER_TRANSITIONS and appends OrderStatusHistory.
 * CANCELLED: cancelOrderTx (the same restock/refund path as the customer cancel).
 * DELIVERED: a COD order becomes PAID. Emails the customer, then returns the detail.
 */
export async function updateOrderStatus(orderNumber: string, status: OrderStatus, note: string | null | undefined) {
  const { oldStatus } = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");
    assertTransition(order.status, status);

    if (status === "CANCELLED") {
      await cancelOrderTx(tx, order, { note: note ?? null, actor: "admin" });
      return { oldStatus: order.status };
    }

    // DELIVERED on a COD order means the cash was collected.
    const paid = status === "DELIVERED" && order.paymentMethod === "COD";
    // Conditional update = claim: a concurrent update cannot apply the same transition twice.
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status, ...(paid ? { paymentStatus: "PAID" as const } : {}) },
    });
    if (count === 0) throw new HttpError(409, "Order status changed, please refresh", "INVALID_STATUS_TRANSITION");
    if (paid) await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "PAID" } });
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status, note: note ?? null } });
    
    return { oldStatus: order.status };
  });
  notifyOrderStatus(orderNumber, status, oldStatus, note);

  return getDetail(orderNumber);
}
