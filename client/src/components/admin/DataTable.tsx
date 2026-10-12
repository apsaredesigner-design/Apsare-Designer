"use client";
/**
 * DataTable: a typed, accessible table for admin lists.
 *
 *   const columns: Column<AdminProductListItem>[] = [
 *     { id: "name", header: "Product", rowHeader: true, sort: { asc: "name_asc", desc: "name_desc" },
 *       cell: (p) => <Link href={`/admin/products/${p.id}/edit`}>{p.name}</Link> },
 *     { id: "price", header: "Price", align: "right", sort: { asc: "salePrice_asc", desc: "salePrice_desc", first: "desc" },
 *       cell: (p) => formatINR(p.salePrice) },
 *     { id: "sold", header: "Sold", hideBelow: "md", sort: { desc: "soldCount_desc" }, cell: (p) => p.soldCount },
 *   ];
 *   <DataTable caption="Products" columns={columns} rows={list.items} rowKey={(p) => p.id}
 *     loading={list.loading} error={list.error} onRetry={list.reload}
 *     sort={list.sort} onSortChange={list.setSort}
 *     selectable selectedIds={sel.selected} onSelectionChange={sel.setSelected} rowLabel={(p) => p.name}
 *     bulkActions={<Button size="sm" variant="danger">Delete</Button>}
 *     empty={<EmptyState title="No products match" />}
 *     footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />} />
 *
 * - `sort` values are the API's exact whitelisted `field_dir` strings; clicking a header
 *   cycles first → other direction → default (null). Headers expose aria-sort.
 * - Loading with no rows shows skeleton rows; loading with rows dims them (aria-busy).
 * - Keyboard: Tab reaches every control; ↑/↓ move focus between rows in the same column.
 *
 * Parts live in ./data-table/: TableHead (sortable headers, select-all), TableBody
 * (skeleton, error, empty and data rows), BulkBar and the Column type.
 */
import type { ReactNode } from "react";
import type { ApiError } from "@/lib/api";
import { BulkBar } from "./data-table/BulkBar";
import { TableBody } from "./data-table/TableBody";
import { TableHead } from "./data-table/TableHead";
import type { Column } from "./data-table/types";
import { card, cx } from "./styles";

export type { Column };

export interface DataTableProps<T, Id extends string | number> {
  caption: string;
  /** Show the caption visually (default: screen-reader only). */
  showCaption?: boolean;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => Id;
  loading?: boolean;
  error?: ApiError | null;
  onRetry?: () => void;
  sort?: string;
  onSortChange?: (sort: string | null) => void;
  selectable?: boolean;
  selectedIds?: Id[];
  onSelectionChange?: (ids: Id[]) => void;
  /** Accessible name for each row's checkbox, e.g. the product name. */
  rowLabel?: (row: T) => string;
  bulkActions?: ReactNode;
  empty?: ReactNode;
  skeletonRows?: number;
  footer?: ReactNode;
  className?: string;
}

export function DataTable<T, Id extends string | number>({
  caption,
  showCaption,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  sort,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowLabel,
  bulkActions,
  empty,
  skeletonRows = 6,
  footer,
  className,
}: DataTableProps<T, Id>) {
  const ids = rows.map(rowKey);
  const selectedOnPage = ids.filter((id) => selectedIds.includes(id));
  const allSelected = ids.length > 0 && selectedOnPage.length === ids.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  const toggleAll = () => onSelectionChange?.(allSelected ? [] : ids);
  const toggle = (id: Id) =>
    onSelectionChange?.(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div className={cx(card, "overflow-hidden", className)}>
      {selectable && selectedOnPage.length > 0 && (
        <BulkBar count={selectedOnPage.length} actions={bulkActions} onClear={() => onSelectionChange?.([])} />
      )}

      <div className="relative overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full border-collapse text-sm" aria-busy={loading || undefined}>
          <caption className={showCaption ? "px-4 pt-4 text-left font-display text-xl font-semibold" : "sr-only"}>{caption}</caption>
          <TableHead
            columns={columns}
            sort={sort}
            onSortChange={onSortChange}
            selection={selectable ? { all: allSelected, some: someSelected, disabled: rows.length === 0, onToggleAll: toggleAll } : undefined}
          />
          <TableBody
            columns={columns}
            rows={rows}
            ids={ids}
            loading={loading}
            error={error}
            onRetry={onRetry}
            empty={empty}
            skeletonRows={skeletonRows}
            selection={selectable ? { selectedIds, onToggle: toggle, rowLabel } : undefined}
          />
        </table>
      </div>
      {footer}
    </div>
  );
}
