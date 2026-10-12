"use client";
/**
 * DateRangeFilter: "From" / "To" date inputs for an IST day range, stored in the list's
 * `from` / `to` params as ISO bounds with +05:30 (so the server filters by IST days).
 *
 *   <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={list.setFilters} />
 */
import { useId } from "react";
import { Input } from "@/components/admin/Input";
import { istEndOfDay, istStartOfDay, toDayInput } from "@/lib/admin/helpers/orders";

interface Props {
  from?: string;
  to?: string;
  onChange: (patch: { from?: string | null; to?: string | null }) => void;
}

export function DateRangeFilter({ from, to, onChange }: Props) {
  const id = useId();
  const fromDay = toDayInput(from);
  const toDay = toDayInput(to);
  const label = "text-xs font-semibold tracking-wide text-ink/70";
  return (
    <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:flex">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${id}-from`} className={label}>From</label>
        <Input
          id={`${id}-from`}
          type="date"
          value={fromDay}
          max={toDay || undefined}
          onChange={(e) => onChange({ from: e.target.value ? istStartOfDay(e.target.value) : null })}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${id}-to`} className={label}>To</label>
        <Input
          id={`${id}-to`}
          type="date"
          value={toDay}
          min={fromDay || undefined}
          onChange={(e) => onChange({ to: e.target.value ? istEndOfDay(e.target.value) : null })}
        />
      </div>
    </div>
  );
}
