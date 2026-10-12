"use client";
/**
 * StatusTabs: a row of toggle buttons filtering the orders list by status ("All" clears).
 * Scrolls horizontally on narrow screens.
 */
import { ORDER_STATUS_TEXT } from "@/components/admin/StatusBadge";
import { cx, focusRing } from "@/components/admin/styles";
import { ORDER_STATUSES } from "@/lib/admin/helpers/orders";
import type { OrderStatus } from "@/lib/admin/types";

export function StatusTabs({ value, onChange }: { value: string; onChange: (status: OrderStatus | null) => void }) {
  const options: { value: OrderStatus | ""; label: string }[] = [{ value: "", label: "All" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_TEXT[s] }))];
  return (
    <div role="group" aria-label="Filter by status" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value || null)}
            className={cx(
              "min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors",
              focusRing,
              active ? "border-ink bg-ink text-ivory" : "border-ink/15 bg-white text-ink/70 hover:border-ink/30 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
