/**
 * Columns for admin order tables: the orders list and a customer's order history.
 */
import Link from "next/link";
import type { Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cx, focusRing } from "@/components/admin/styles";
import { formatDateTime, formatINR, formatNumber } from "@/lib/admin/format";
import { PAYMENT_METHOD_TEXT } from "@/lib/admin/helpers/orders";
import type { AdminOrderListItem } from "@/lib/admin/types";

export const linkClass = cx("rounded font-semibold text-ink underline-offset-4 hover:underline", focusRing);

export function orderColumns({ withCustomer = true } = {}): Column<AdminOrderListItem>[] {
  const cols: (Column<AdminOrderListItem> | false)[] = [
    {
      id: "order",
      header: "Order",
      rowHeader: true,
      cell: (o) => (
        <Link href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`} className={cx(linkClass, "font-mono text-xs tracking-wide whitespace-nowrap")}>
          {o.orderNumber}
        </Link>
      ),
    },
    {
      id: "date",
      header: "Placed",
      hideBelow: "sm",
      sort: { asc: "createdAt_asc", desc: "createdAt_desc", first: "desc" },
      cell: (o) => <span className="whitespace-nowrap text-ink/65">{formatDateTime(o.createdAt)}</span>,
    },
    withCustomer && {
      id: "customer",
      header: "Customer",
      hideBelow: "md",
      cell: (o) => (
        <Link href={`/admin/customers/${o.user.id}`} className={cx(linkClass, "font-normal")}>
          {o.user.fullName}
          <span className="block text-xs text-ink/50">{o.shipCity}</span>
        </Link>
      ),
    },
    { id: "items", header: "Items", align: "right", hideBelow: "lg", cell: (o) => <span className="tabular-nums">{formatNumber(o._count.items)}</span> },
    {
      id: "total",
      header: "Total",
      align: "right",
      sort: { asc: "finalAmount_asc", desc: "finalAmount_desc", first: "desc" },
      cell: (o) => <span className="font-semibold tabular-nums">{formatINR(o.finalAmount)}</span>,
    },
    {
      id: "payment",
      header: "Payment",
      hideBelow: "lg",
      cell: (o) => (
        <span className="flex flex-col items-start gap-1">
          <span className="text-xs text-ink/70">{PAYMENT_METHOD_TEXT[o.paymentMethod]}</span>
          <StatusBadge status={o.paymentStatus} />
        </span>
      ),
    },
    { id: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
  ];
  return cols.filter((c): c is Column<AdminOrderListItem> => Boolean(c));
}
