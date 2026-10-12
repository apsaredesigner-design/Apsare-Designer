import { OrderStatus, Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

// GET /api/admin/dashboard logic (extracted from server admin.dashboard.ts).

/** Store days are Indian Standard Time (no DST, so a fixed +05:30 offset); the DB stores UTC. */
const STORE_OFFSET_MS = 330 * 60 * 1000;
const DAYS = 30;
const LOW_STOCK = 5;
/** Orders that still need action before they ship. */
const PENDING: OrderStatus[] = ["PLACED", "CONFIRMED", "PACKED"];

/** UTC instant of 00:00 IST on the store day containing `d`, shifted by `addDays`. */
function storeDayStart(d: Date, addDays = 0): Date {
  const local = new Date(d.getTime() + STORE_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() + addDays);
  return new Date(local.getTime() - STORE_OFFSET_MS);
}
/** YYYY-MM-DD of the store day starting at `start` (a value from storeDayStart). */
const storeDate = (start: Date) => new Date(start.getTime() + STORE_OFFSET_MS).toISOString().slice(0, 10);

const variantSelect = {
  id: true,
  sku: true,
  size: true,
  color: true,
  stock: true,
  product: { select: { id: true, name: true, slug: true } },
} as const;

type VariantRow = { id: number; sku: string; size: string; color: string; stock: number; product: { id: number; name: string; slug: string } };
const toLowStock = ({ id, ...v }: VariantRow) => ({ variantId: id, ...v });

/** GET /api/admin/dashboard -> AdminDashboardStats */
export async function getDashboard() {
  const now = new Date();
  const today = storeDayStart(now);
  const since = storeDayStart(now, -(DAYS - 1));

  const [products, orders, customers, sales, todayOrders, pendingOrders, lowStock, outOfStock, daily, byStatus, recentOrders] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { finalAmount: true } }),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: { in: PENDING } } }),
      prisma.productVariant.findMany({
        where: { stock: { gt: 0, lte: LOW_STOCK }, product: { isActive: true } },
        orderBy: [{ stock: "asc" }, { id: "asc" }],
        take: 10,
        select: variantSelect,
      }),
      prisma.productVariant.findMany({
        where: { stock: { lte: 0 }, product: { isActive: true } },
        orderBy: { id: "asc" },
        take: 10,
        select: variantSelect,
      }),
      prisma.$queryRaw<{ day: string; sales: unknown; orders: bigint }[]>(Prisma.sql`
        SELECT to_char("createdAt" + interval '5 hours 30 minutes', 'YYYY-MM-DD') AS day,
               SUM("finalAmount") AS sales, COUNT(*) AS orders
        FROM "Order"
        WHERE "createdAt" >= ${since} AND status <> 'CANCELLED'
        GROUP BY day`),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, orderNumber: true, status: true, finalAmount: true, createdAt: true },
      }),
    ]);

  const byDay = new Map(daily.map((r) => [r.day, r]));
  const salesOverTime = Array.from({ length: DAYS }, (_, i) => {
    const date = storeDate(storeDayStart(now, i - (DAYS - 1)));
    const row = byDay.get(date);
    return { date, sales: row ? Number(row.sales) : 0, orders: row ? Number(row.orders) : 0 };
  });

  const counts = new Map(byStatus.map((r) => [r.status, r._count._all]));
  const ordersByStatus = Object.values(OrderStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }));

  return {
    totals: { products, orders, customers, sales: sales._sum.finalAmount?.toNumber() ?? 0 },
    todayOrders,
    pendingOrders,
    lowStock: lowStock.map(toLowStock),
    outOfStock: outOfStock.map(toLowStock),
    salesOverTime,
    ordersByStatus,
    recentOrders,
  };
}
