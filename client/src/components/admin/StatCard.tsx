/**
 * StatCard: a headline number (KPI tile).
 *
 *   <StatCard label="Total sales" value={formatINR(stats.totals.sales)} icon={<RupeeIcon />}
 *             hint="Excludes cancelled orders" href="/admin/orders" />
 *   <StatCard label="Pending" value="4" tone="attention" />
 *   <StatCard label="Orders" loading />
 *
 * `href` makes the whole card a link. `tone="attention"` adds a gold accent.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";
import { card, cx, focusRing } from "./styles";

export interface StatCardProps {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  tone?: "default" | "attention";
  loading?: boolean;
}

export function StatCard({ label, value, hint, icon, href, tone = "default", loading }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-ink/55 uppercase">{label}</p>
        {icon && (
          <span
            aria-hidden
            className={cx(
              "grid size-9 place-items-center rounded-full [&_svg]:size-[18px]",
              tone === "attention" ? "bg-gold-300/30 text-gold-700" : "bg-sage-100 text-sage-700",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-28" />
      ) : (
        <p className="mt-2 font-display text-[2.25rem] leading-none font-semibold text-ink lining-nums tabular-nums">{value}</p>
      )}
      {hint && <p className="mt-2 text-xs text-ink/55">{hint}</p>}
    </>
  );

  const classes = cx(
    card,
    "relative block p-5 transition-[border-color,box-shadow] duration-200",
    tone === "attention" && "before:absolute before:inset-y-5 before:left-0 before:w-0.5 before:rounded-full before:bg-gold-500",
    href && "hover:border-ink/20 hover:shadow-[0_8px_24px_-16px_rgba(27,27,24,0.35)]",
  );

  if (href) {
    return (
      <Link href={href} className={cx(classes, focusRing)} aria-busy={loading || undefined}>
        {body}
      </Link>
    );
  }
  return (
    <div className={classes} aria-busy={loading || undefined}>
      {body}
    </div>
  );
}
