"use client";
/**
 * Admin dashboard: GET /api/admin/dashboard → KPI cards, 30-day sales line,
 * orders-by-status donut, low/out-of-stock variants and recent orders.
 */
import Link from "next/link";
import { Button, ButtonLink } from "@/components/admin/Button";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { DonutChart } from "@/components/admin/DonutChart";
import { EmptyState } from "@/components/admin/EmptyState";
import { BoxIcon, CartIcon, CheckIcon, ClockIcon, ReceiptIcon, RupeeIcon, UsersIcon } from "@/components/admin/icons";
import { LineChart } from "@/components/admin/LineChart";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/Skeleton";
import { StatCard } from "@/components/admin/StatCard";
import { Badge, ORDER_STATUS_COLOR, ORDER_STATUS_TEXT, StatusBadge } from "@/components/admin/StatusBadge";
import { card, cx, focusRing } from "@/components/admin/styles";
import { errorMessage } from "@/lib/admin/errors";
import { formatCompactINR, formatDateTime, formatDay, formatINR, formatNumber } from "@/lib/admin/format";
import type { AdminDashboardStats, LowStockVariant } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";

type RecentOrder = AdminDashboardStats["recentOrders"][number];

const link = cx("rounded font-semibold text-ink underline-offset-4 hover:underline", focusRing);

const stockColumns = (tone: "warning" | "danger"): Column<LowStockVariant>[] => [
  {
    id: "product",
    header: "Product",
    rowHeader: true,
    cell: (v) => (
      <Link href={`/admin/products/${v.product.id}/edit`} className={link}>
        {v.product.name}
      </Link>
    ),
  },
  { id: "variant", header: "Variant", cell: (v) => <span className="text-ink/70">{v.size} · {v.color}</span> },
  { id: "sku", header: "SKU", hideBelow: "md", cell: (v) => <span className="font-mono text-xs text-ink/55">{v.sku}</span> },
  {
    id: "stock",
    header: "Stock",
    align: "right",
    cell: (v) => <Badge tone={tone}>{v.stock <= 0 ? "Out" : `${v.stock} left`}</Badge>,
  },
];

const recentColumns: Column<RecentOrder>[] = [
  {
    id: "order",
    header: "Order",
    rowHeader: true,
    cell: (o) => (
      <Link href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`} className={cx(link, "font-mono text-xs tracking-wide")}>
        {o.orderNumber}
      </Link>
    ),
  },
  { id: "date", header: "Placed", hideBelow: "sm", cell: (o) => <span className="text-ink/65">{formatDateTime(o.createdAt)}</span> },
  { id: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
  { id: "amount", header: "Amount", align: "right", cell: (o) => <span className="font-semibold tabular-nums">{formatINR(o.finalAmount)}</span> },
];

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0", className)} aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardView() {
  const { data, loading, error, reload } = useAdminQuery<AdminDashboardStats>("/admin/dashboard");

  const header = (
    <PageHeader
      title="Dashboard"
      description="Your atelier at a glance: sales, orders and stock that needs attention."
      actions={
        <>
          <Button variant="secondary" onClick={reload} loading={loading && !!data}>
            Refresh
          </Button>
          <ButtonLink href="/admin/orders" icon={<ReceiptIcon />}>
            View orders
          </ButtonLink>
        </>
      }
    />
  );

  if (error && !data) {
    return (
      <>
        {header}
        <div className={card}>
          <EmptyState
            tone="error"
            title="Couldn't load the dashboard"
            description={errorMessage(error)}
            action={<Button onClick={reload}>Try again</Button>}
          />
        </div>
      </>
    );
  }

  const s = data;
  const sales30 = s?.salesOverTime.reduce((a, d) => a + d.sales, 0) ?? 0;
  const orders30 = s?.salesOverTime.reduce((a, d) => a + d.orders, 0) ?? 0;
  const busy = !s;

  return (
    <div aria-busy={loading || undefined}>
      {header}

      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total sales" value={s && formatINR(s.totals.sales)} hint="All time, excluding cancelled" icon={<RupeeIcon />} loading={busy} />
        <StatCard label="Orders" value={s && formatNumber(s.totals.orders)} hint="All time" icon={<ReceiptIcon />} href="/admin/orders" loading={busy} />
        <StatCard label="Today's orders" value={s && formatNumber(s.todayOrders)} hint="Since midnight IST" icon={<CartIcon />} loading={busy} />
        <StatCard
          label="Pending"
          value={s && formatNumber(s.pendingOrders)}
          hint="Placed, confirmed or packed"
          icon={<ClockIcon />}
          href="/admin/orders?status=PLACED"
          tone={s && s.pendingOrders > 0 ? "attention" : "default"}
          loading={busy}
        />
        <StatCard label="Products" value={s && formatNumber(s.totals.products)} hint="Active and inactive" icon={<BoxIcon />} href="/admin/products" loading={busy} />
        <StatCard label="Customers" value={s && formatNumber(s.totals.customers)} hint="Registered accounts" icon={<UsersIcon />} href="/admin/customers" loading={busy} />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className={cx(card, "min-w-0 p-5 sm:p-6 xl:col-span-2")}>
          {s ? (
            <LineChart
              title="Sales, last 30 days"
              description={`${formatINR(sales30)} from ${formatNumber(orders30)} orders · daily, IST · excludes cancelled`}
              data={s.salesOverTime.map((d) => ({ label: formatDay(d.date), value: d.sales }))}
              valueLabel="Sales"
              formatValue={(v) => formatINR(v)}
              formatAxis={formatCompactINR}
              height={260}
            />
          ) : (
            <ChartSkeleton />
          )}
        </div>
        <div className={cx(card, "min-w-0 p-5 sm:p-6")}>
          {s ? (
            <DonutChart
              title="Orders by status"
              description="All orders, current status"
              data={s.ordersByStatus.map((o) => ({ label: ORDER_STATUS_TEXT[o.status], value: o.count, color: ORDER_STATUS_COLOR[o.status] }))}
              centerLabel="orders"
              size={168}
            />
          ) : (
            <ChartSkeleton donut />
          )}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Panel title="Low stock" action={<ButtonLink href="/admin/products?stock=low" variant="ghost" size="sm">View all</ButtonLink>}>
          <DataTable
            caption="Low stock variants (5 or fewer left)"
            columns={stockColumns("warning")}
            rows={s?.lowStock ?? []}
            rowKey={(v) => v.variantId}
            loading={busy}
            skeletonRows={4}
            empty={<EmptyState compact icon={<CheckIcon />} title="Stock looks healthy" description="No variants are running low." />}
          />
        </Panel>
        <Panel title="Out of stock" action={<ButtonLink href="/admin/products?stock=out" variant="ghost" size="sm">View all</ButtonLink>}>
          <DataTable
            caption="Out of stock variants"
            columns={stockColumns("danger")}
            rows={s?.outOfStock ?? []}
            rowKey={(v) => v.variantId}
            loading={busy}
            skeletonRows={4}
            empty={<EmptyState compact icon={<CheckIcon />} title="Nothing is sold out" description="Every active variant has stock." />}
          />
        </Panel>
      </div>

      <Panel title="Recent orders" className="mt-10" action={<ButtonLink href="/admin/orders" variant="ghost" size="sm">All orders</ButtonLink>}>
        <DataTable
          caption="Five most recent orders"
          columns={recentColumns}
          rows={s?.recentOrders ?? []}
          rowKey={(o) => o.id}
          loading={busy}
          skeletonRows={5}
          empty={<EmptyState compact icon={<ReceiptIcon />} title="No orders yet" description="New orders will appear here." />}
        />
      </Panel>
    </div>
  );
}

function ChartSkeleton({ donut }: { donut?: boolean }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      {donut ? (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
          <Skeleton className="size-40 shrink-0 rounded-full" />
          <div className="w-full space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ) : (
        <Skeleton className="mt-6 h-[260px] w-full" />
      )}
    </div>
  );
}
