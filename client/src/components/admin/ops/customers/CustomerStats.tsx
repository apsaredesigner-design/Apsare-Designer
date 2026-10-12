/** Lifetime stat cards for a customer (non-cancelled orders). */
import { CartIcon, ClockIcon, ReceiptIcon, RupeeIcon } from "@/components/admin/icons";
import { StatCard } from "@/components/admin/StatCard";
import { formatDate, formatINR, formatNumber } from "@/lib/admin/format";
import type { CustomerStats as Stats } from "@/lib/admin/types";

export function CustomerStats({ stats }: { stats?: Stats }) {
  const busy = !stats;
  return (
    <section aria-label="Customer figures" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total spent" value={stats && formatINR(stats.totalSpent)} hint="Excludes cancelled orders" icon={<RupeeIcon />} loading={busy} />
      <StatCard
        label="Orders"
        value={stats && formatNumber(stats.orders)}
        hint={stats && `${formatNumber(stats.cancelledOrders)} cancelled`}
        icon={<ReceiptIcon />}
        loading={busy}
      />
      <StatCard label="Average order" value={stats && formatINR(stats.averageOrderValue)} icon={<CartIcon />} loading={busy} />
      <StatCard
        label="Last order"
        value={stats && (stats.lastOrderAt ? formatDate(stats.lastOrderAt) : "None yet")}
        hint={stats?.firstOrderAt ? `First on ${formatDate(stats.firstOrderAt)}` : undefined}
        icon={<ClockIcon />}
        loading={busy}
      />
    </section>
  );
}
