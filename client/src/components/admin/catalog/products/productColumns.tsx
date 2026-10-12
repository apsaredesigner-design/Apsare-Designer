"use client";
/**
 * Column definitions for the products DataTable. `onToggleActive` flips a row's
 * status (optimistic; see useActiveToggle).
 */
import Link from "next/link";
import type { Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/StatusBadge";
import { cx, focusRing } from "@/components/admin/styles";
import { Switch } from "@/components/admin/Switch";
import { formatDate, formatINR, formatNumber } from "@/lib/admin/format";
import { PRODUCT_FLAGS } from "@/lib/admin/helpers/products";
import type { AdminProductListItem, StockState } from "@/lib/admin/types";
import { Thumb } from "../../shared/Thumb";

const STOCK: Record<StockState, { tone: "success" | "warning" | "danger"; label: string }> = {
  in: { tone: "success", label: "In stock" },
  low: { tone: "warning", label: "Low stock" },
  out: { tone: "danger", label: "Out of stock" },
};

const FLAG_SHORT = { isNewArrival: "New", isTrending: "Trending", isBestSeller: "Best seller", isDealOfDay: "Deal" } as const;

export function productColumns(opts: {
  onToggleActive: (p: AdminProductListItem, next: boolean) => void;
  busyIds: number[];
}): Column<AdminProductListItem>[] {
  return [
    {
      id: "name",
      header: "Product",
      rowHeader: true,
      sort: { asc: "name_asc", desc: "name_desc" },
      cell: (p) => (
        <div className="flex min-w-56 items-center gap-3">
          <Thumb src={p.image?.url ?? null} alt="" className="h-14 w-11 ring-1 ring-ink/10" />
          <span className="min-w-0">
            <Link
              href={`/admin/products/${p.id}/edit`}
              className={cx("line-clamp-2 rounded font-semibold text-ink underline-offset-4 hover:underline", focusRing)}
            >
              {p.name}
            </Link>
            <span className="block font-mono text-xs text-ink/55">{p.code}</span>
          </span>
        </div>
      ),
    },
    { id: "category", header: "Category", hideBelow: "md", cell: (p) => <span className="text-ink/70">{p.category.name}</span> },
    {
      id: "price",
      header: "Price",
      align: "right",
      sort: { asc: "salePrice_asc", desc: "salePrice_desc" },
      cell: (p) => (
        <span className="block whitespace-nowrap tabular-nums">
          <span className="font-semibold">{formatINR(p.salePrice)}</span>
          {p.discountPercent > 0 && <span className="block text-xs text-ink/50 line-through">{formatINR(p.mrp)}</span>}
        </span>
      ),
    },
    {
      id: "discount",
      header: "% off",
      align: "right",
      hideBelow: "sm",
      sort: { desc: "discountPercent_desc" },
      cell: (p) => (p.discountPercent > 0 ? <span className="font-semibold text-sage-700">{p.discountPercent}%</span> : <span className="text-ink/40">—</span>),
    },
    {
      id: "stock",
      header: "Stock",
      cell: (p) => (
        <span className="flex flex-col items-start gap-0.5 whitespace-nowrap">
          <Badge tone={STOCK[p.stockState].tone}>{STOCK[p.stockState].label}</Badge>
          <span className="text-xs text-ink/50">
            {formatNumber(p.totalStock)} units · {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}
          </span>
        </span>
      ),
    },
    {
      id: "active",
      header: "Active",
      cell: (p) => (
        <Switch
          size="sm"
          aria-label={`Active: ${p.name}`}
          checked={p.isActive}
          disabled={opts.busyIds.includes(p.id)}
          onChange={(v) => opts.onToggleActive(p, v)}
        />
      ),
    },
    {
      id: "flags",
      header: "Flags",
      hideBelow: "lg",
      cell: (p) => {
        const on = PRODUCT_FLAGS.filter((f) => p[f]);
        return on.length ? (
          <span className="flex max-w-44 flex-wrap gap-1">
            {on.map((f) => (
              <Badge key={f} tone="gold">{FLAG_SHORT[f]}</Badge>
            ))}
          </span>
        ) : (
          <span className="text-ink/40">—</span>
        );
      },
    },
    { id: "sold", header: "Sold", align: "right", hideBelow: "lg", sort: { desc: "soldCount_desc" }, cell: (p) => <span className="tabular-nums">{formatNumber(p.soldCount)}</span> },
    {
      id: "updated",
      header: "Updated",
      hideBelow: "md",
      sort: { desc: "updatedAt_desc" },
      cell: (p) => <span className="whitespace-nowrap text-ink/60">{formatDate(p.updatedAt)}</span>,
    },
  ];
}
