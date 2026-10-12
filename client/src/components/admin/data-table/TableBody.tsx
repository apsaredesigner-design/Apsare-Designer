/**
 * TableBody: skeleton rows while the first page loads, the error row, the empty row,
 * and the data rows (with selection checkboxes). ↑/↓ move focus between rows in the
 * same column.
 */
import type { ReactNode } from "react";
import type { ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/admin/errors";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import { EmptyState } from "../EmptyState";
import { Skeleton } from "../Skeleton";
import { cx } from "../styles";
import { ALIGN, HIDE, type Column } from "./types";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function onGridKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "SELECT" || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox")) return;
  const row = target.closest("tr");
  const sibling = (e.key === "ArrowDown" ? row?.nextElementSibling : row?.previousElementSibling) as HTMLElement | null;
  if (!row || !sibling) return;
  const index = Array.from(row.querySelectorAll<HTMLElement>(FOCUSABLE)).indexOf(target);
  const targets = sibling.querySelectorAll<HTMLElement>(FOCUSABLE);
  const next = targets[Math.max(0, index)] ?? targets[0];
  if (next) {
    e.preventDefault();
    next.focus();
  }
}

interface Props<T, Id extends string | number> {
  columns: Column<T>[];
  rows: T[];
  ids: Id[];
  loading: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  empty?: ReactNode;
  skeletonRows: number;
  /** Present when the table is selectable. */
  selection?: { selectedIds: Id[]; onToggle: (id: Id) => void; rowLabel?: (row: T) => string };
}

export function TableBody<T, Id extends string | number>({ columns, rows, ids, loading, error, onRetry, empty, skeletonRows, selection }: Props<T, Id>) {
  const colCount = columns.length + (selection ? 1 : 0);
  const showSkeleton = loading && rows.length === 0 && !error;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <tbody onKeyDown={onGridKeyDown} className={cx(loading && rows.length > 0 && "opacity-55 transition-opacity")}>
      {showSkeleton &&
        Array.from({ length: skeletonRows }, (_, r) => (
          <tr key={`sk-${r}`} className="border-b border-ink/5 last:border-0">
            {selection && (
              <td className="py-4 pl-5">
                <Skeleton className="size-5" />
              </td>
            )}
            {columns.map((col, c) => (
              <td key={col.id} className={cx("px-4 py-4", col.hideBelow && HIDE[col.hideBelow])}>
                <Skeleton className={cx("h-4", c === 0 ? "w-40" : "w-20", col.align === "right" && "ml-auto")} />
              </td>
            ))}
          </tr>
        ))}

      {error && (
        <tr>
          <td colSpan={colCount}>
            <EmptyState
              tone="error"
              compact
              title="Couldn't load this list"
              description={errorMessage(error)}
              action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
            />
          </td>
        </tr>
      )}

      {showEmpty && (
        <tr>
          <td colSpan={colCount}>{empty ?? <EmptyState compact title="Nothing here yet" />}</td>
        </tr>
      )}

      {!error &&
        rows.map((row, r) => {
          const id = ids[r];
          const selected = selection?.selectedIds.includes(id) ?? false;
          return (
            <tr
              key={String(id)}
              aria-selected={selection ? selected : undefined}
              className={cx("border-b border-ink/5 transition-colors last:border-0 hover:bg-ivory/80", selected && "bg-sage-50")}
            >
              {selection && (
                <td className="w-12 pl-2">
                  <Checkbox
                    aria-label={`Select ${selection.rowLabel ? selection.rowLabel(row) : `row ${r + 1}`}`}
                    checked={selected}
                    onChange={() => selection.onToggle(id)}
                  />
                </td>
              )}
              {columns.map((col) => {
                const Cell = col.rowHeader ? "th" : "td";
                return (
                  <Cell
                    key={col.id}
                    scope={col.rowHeader ? "row" : undefined}
                    className={cx(
                      "px-4 py-3 align-middle",
                      col.rowHeader && "font-normal",
                      ALIGN[col.align ?? "left"],
                      col.hideBelow && HIDE[col.hideBelow],
                      col.className,
                    )}
                  >
                    {col.cell(row, r)}
                  </Cell>
                );
              })}
            </tr>
          );
        })}
    </tbody>
  );
}
