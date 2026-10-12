/**
 * TableHead: the header row with the select-all checkbox and sortable column
 * headers. Clicking a sortable header cycles first → other direction → default
 * (null); headers expose aria-sort.
 */
import { Checkbox } from "../Checkbox";
import { ArrowDownIcon, ArrowUpIcon, SortIcon } from "../icons";
import { cx, focusRing } from "../styles";
import { ALIGN, HIDE, type Column } from "./types";

export function nextSort(col: Column<unknown>["sort"], current: string | undefined): string | null {
  if (!col) return null;
  const first = col.first ?? (col.asc ? "asc" : "desc");
  const order = [col[first], col[first === "asc" ? "desc" : "asc"]].filter((v): v is string => Boolean(v));
  const i = order.indexOf(current ?? "");
  if (i === -1) return order[0];
  return order[i + 1] ?? null;
}

interface Props<T> {
  columns: Column<T>[];
  sort?: string;
  onSortChange?: (sort: string | null) => void;
  /** Present when the table is selectable. */
  selection?: { all: boolean; some: boolean; disabled: boolean; onToggleAll: () => void };
}

export function TableHead<T>({ columns, sort, onSortChange, selection }: Props<T>) {
  return (
    <thead>
      <tr className="border-b border-ink/10 bg-ivory/70">
        {selection && (
          <th scope="col" className="w-12 pl-2">
            <Checkbox
              aria-label={selection.all ? "Deselect all rows on this page" : "Select all rows on this page"}
              checked={selection.all}
              indeterminate={selection.some}
              onChange={selection.onToggleAll}
              disabled={selection.disabled}
            />
          </th>
        )}
        {columns.map((col) => {
          const dir = col.sort && sort ? (sort === col.sort.asc ? "ascending" : sort === col.sort.desc ? "descending" : undefined) : undefined;
          return (
            <th
              key={col.id}
              scope="col"
              aria-sort={col.sort ? (dir ?? "none") : undefined}
              className={cx(
                "px-4 py-2 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-ink/60 uppercase",
                ALIGN[col.align ?? "left"],
                col.hideBelow && HIDE[col.hideBelow],
                col.headerClassName,
              )}
            >
              {col.sort && onSortChange ? (
                <button
                  type="button"
                  onClick={() => onSortChange(nextSort(col.sort, sort))}
                  className={cx(
                    "-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded px-2 uppercase transition-colors hover:text-ink",
                    dir && "text-ink",
                    col.align === "right" && "flex-row-reverse",
                    focusRing,
                  )}
                >
                  {col.header}
                  {dir === "ascending" ? (
                    <ArrowUpIcon className="size-3.5" />
                  ) : dir === "descending" ? (
                    <ArrowDownIcon className="size-3.5" />
                  ) : (
                    <SortIcon className="size-3.5 opacity-40" />
                  )}
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center">{col.header}</span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
