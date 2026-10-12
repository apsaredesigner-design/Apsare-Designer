import type { Prisma, Role } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { ListQuery } from "./admin.customers.schemas";
import { toOrderBy } from "./admin.shared";

// /api/admin/customers logic (extracted from server admin.customers.ts).

/** Never select passwordHash. */
const userSelect = {
  id: true,
  fullName: true,
  email: true,
  mobile: true,
  role: true,
  isActive: true,
  createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

/** Sum of finalAmount over non-cancelled orders, per user, in one query. */
async function spentByUser(userIds: number[]): Promise<Map<number, number>> {
  if (!userIds.length) return new Map();
  const rows = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: { not: "CANCELLED" } },
    _sum: { finalAmount: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.finalAmount?.toNumber() ?? 0]));
}

const shape = ({ _count, ...u }: Prisma.UserGetPayload<{ select: typeof userSelect }>, spent: Map<number, number>) => ({
  ...u,
  orderCount: _count.orders,
  totalSpent: spent.get(u.id) ?? 0,
});

export async function listCustomers(q: ListQuery) {
  const where: Prisma.UserWhereInput = {
    role: q.role,
    ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
    ...(q.q
      ? {
          OR: [
            { fullName: { contains: q.q, mode: "insensitive" } },
            { email: { contains: q.q, mode: "insensitive" } },
            { mobile: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput = q.sort === "orders_desc" ? { orders: { _count: "desc" } } : toOrderBy(q.sort);

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [orderBy, { id: "desc" }], ...toSkipTake(q), select: userSelect }),
    prisma.user.count({ where }),
  ]);
  const spent = await spentByUser(users.map((u) => u.id));
  return paginated(users.map((u) => shape(u, spent)), total, q.page, q.limit);
}

/** Lifetime numbers for the customer detail header. Cancelled orders are excluded from money and counts. */
async function customerStats(userId: number) {
  const [placed, cancelledOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { userId, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { finalAmount: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    prisma.order.count({ where: { userId, status: "CANCELLED" } }),
  ]);
  const orders = placed._count._all;
  const spent = placed._sum.finalAmount?.toNumber() ?? 0;
  return {
    orders,
    cancelledOrders,
    totalSpent: spent,
    averageOrderValue: orders ? Math.round((spent / orders) * 100) / 100 : 0,
    firstOrderAt: placed._min.createdAt,
    lastOrderAt: placed._max.createdAt,
  };
}

export async function getCustomer(id: number) {
  const [user, spent, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        updatedAt: true,
        addresses: { orderBy: [{ isDefault: "desc" }, { id: "asc" }] },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentMethod: true,
            paymentStatus: true,
            finalAmount: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        },
      },
    }),
    spentByUser([id]),
    customerStats(id),
  ]);
  if (!user) throw new HttpError(404, "Customer not found");
  const { orders, ...rest } = user;
  return { ...shape(rest, spent), stats, recentOrders: orders };
}

/**
 * Applies a role or active-flag change. Every active admin row is locked first,
 * so two admins demoting or disabling each other at the same moment are
 * serialised: the actor must still be an active admin, and at least one active
 * admin must remain (409 LAST_ADMIN).
 */
function updateAccount(actorId: number, id: number, data: { role?: Role; isActive?: boolean }) {
  return prisma.$transaction(async (tx) => {
    const admins = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM "User" WHERE role = 'ADMIN' AND "isActive" = true FOR UPDATE`;
    const activeAdmins = new Set(admins.map((a) => Number(a.id)));
    if (!activeAdmins.has(actorId)) throw new HttpError(403, "Admin access required");
    const target = await tx.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, "Customer not found");
    const losesAdmin = activeAdmins.has(id) && (data.role === "CUSTOMER" || data.isActive === false);
    if (losesAdmin && activeAdmins.size <= 1) {
      throw new HttpError(409, "At least one active admin must remain", "LAST_ADMIN");
    }
    return tx.user.update({ where: { id }, data, select: { id: true, role: true, isActive: true } });
  });
}

/** PATCH /:id/status. `actorId` = the signed-in admin (ctx.user.id). You cannot deactivate yourself. */
export async function setCustomerStatus(actorId: number, id: number, isActive: boolean) {
  if (id === actorId && !isActive) throw new HttpError(400, "You cannot deactivate your own account", "SELF_DEACTIVATION");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omitted on purpose (rest destructuring)
  const { role: _role, ...user } = await updateAccount(actorId, id, { isActive });
  return user;
}

/** Promote a customer to admin or demote an admin. You cannot change your own role; the last active admin cannot be demoted. */
export async function setCustomerRole(actorId: number, id: number, role: Role) {
  if (id === actorId) throw new HttpError(400, "You cannot change your own role", "SELF_ROLE_CHANGE");
  return updateAccount(actorId, id, { role });
}
