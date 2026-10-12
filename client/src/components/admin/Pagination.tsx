"use client";
/**
 * Pagination: "Showing x–y of total", a page-size select and page buttons with ellipses.
 *
 *   <Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
 *
 * `meta` is the API's Paginated meta; renders nothing until it is available.
 * Page buttons are 44px targets; the current page has aria-current="page".
 */
import { useId } from "react";
import type { Paginated } from "@/types";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Select } from "./Select";
import { cx, focusRing } from "./styles";

export interface PaginationProps {
  meta: Paginated<unknown>["meta"] | undefined;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizes?: readonly number[];
  className?: string;
}

/** 1 … 4 5 [6] 7 8 … 20 */
export function pageList(current: number, total: number, siblings = 1): (number | "…")[] {
  if (total <= 5 + siblings * 2) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);
  const pages: (number | "…")[] = [1];
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

const btn = cx(
  "inline-grid min-w-11 h-11 place-items-center rounded-md px-2 text-sm tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-35",
  focusRing,
);

export function Pagination({ meta, onPageChange, onLimitChange, pageSizes = [10, 20, 50, 100], className }: PaginationProps) {
  const id = useId();
  if (!meta) return null;
  const { page, limit, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={cx("flex flex-col gap-3 border-t border-ink/10 px-4 py-3 text-sm text-ink/70 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p aria-live="polite">
          Showing <span className="font-semibold text-ink tabular-nums">{from}</span>–
          <span className="font-semibold text-ink tabular-nums">{to}</span> of{" "}
          <span className="font-semibold text-ink tabular-nums">{total}</span>
        </p>
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={id} className="whitespace-nowrap">
              Rows per page
            </label>
            <Select id={id} value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} className="w-20">
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination">
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              <button type="button" className={cx(btn, "hover:bg-ink/5")} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                <ChevronLeftIcon className="size-4" />
              </button>
            </li>
            {pageList(page, totalPages).map((p, i) =>
              p === "…" ? (
                <li key={`gap-${i}`} aria-hidden className="grid h-11 w-8 place-items-center text-ink/40">
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Page ${p}`}
                    className={cx(btn, p === page ? "bg-ink font-semibold text-ivory" : "hover:bg-ink/5")}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
            <li>
              <button type="button" className={cx(btn, "hover:bg-ink/5")} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                <ChevronRightIcon className="size-4" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
