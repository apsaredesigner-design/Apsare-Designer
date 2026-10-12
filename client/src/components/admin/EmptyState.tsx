/**
 * EmptyState: a calm placeholder for "nothing here" and error states.
 *
 *   <EmptyState title="No products yet" description="Add your first saree to get started."
 *               action={<ButtonLink href="/admin/products/new">Add product</ButtonLink>} />
 *   <EmptyState tone="error" title="Couldn't load orders" description={err.message}
 *               action={<Button onClick={reload}>Try again</Button>} />
 *
 * `compact` reduces the padding for use inside cards and table cells.
 */
import type { ReactNode } from "react";
import { BoxIcon, WarningIcon } from "./icons";
import { cx } from "./styles";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "error";
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, action, icon, tone = "neutral", compact, className }: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cx("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-16", className)}
    >
      <span
        className={cx(
          "grid size-12 place-items-center rounded-full [&_svg]:size-6",
          tone === "error" ? "bg-sale/10 text-sale" : "bg-sage-100 text-sage-700",
        )}
      >
        {icon ?? (tone === "error" ? <WarningIcon /> : <BoxIcon />)}
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink/60">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
