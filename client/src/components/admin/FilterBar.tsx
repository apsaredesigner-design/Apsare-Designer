"use client";
/**
 * FilterBar: the row above a table holding search + filter controls, with a
 * "Clear filters" button shown while any filter is active.
 *
 *   <FilterBar
 *     search={<SearchInput label="Search orders" value={list.search} onChange={list.setSearch} />}
 *     active={list.hasActiveFilters}
 *     onClear={list.clearFilters}
 *   >
 *     <FilterSelect label="Status" value={list.filters.status} onChange={(v) => list.setFilter("status", v)}
 *                   options={[{ value: "", label: "All statuses" }, …]} />
 *   </FilterBar>
 *
 * FilterSelect is a compact labelled Select for filter values ("" = no filter).
 */
import { useId, type ReactNode } from "react";
import { Button } from "./Button";
import { CloseIcon } from "./icons";
import { Select, type SelectOption } from "./Select";
import { cx } from "./styles";

export interface FilterBarProps {
  search?: ReactNode;
  children?: ReactNode;
  active?: boolean;
  onClear?: () => void;
  /** Right-aligned extras, e.g. an Export button. */
  end?: ReactNode;
  className?: string;
}

export function FilterBar({ search, children, active, onClear, end, className }: FilterBarProps) {
  return (
    <div role="search" className={cx("mb-4 flex flex-col gap-3 lg:flex-row lg:items-end", className)}>
      {search && <div className="w-full lg:max-w-xs">{search}</div>}
      {children && <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">{children}</div>}
      <div className="flex items-end gap-2 lg:ml-auto">
        {active && onClear && (
          <Button variant="ghost" size="sm" onClick={onClear} icon={<CloseIcon />}>
            Clear filters
          </Button>
        )}
        {end}
      </div>
    </div>
  );
}

export interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  className?: string;
}

export function FilterSelect({ label, value, onChange, options, className }: FilterSelectProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5 lg:min-w-40", className)}>
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-ink/70">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value || null)} options={options} />
    </div>
  );
}
