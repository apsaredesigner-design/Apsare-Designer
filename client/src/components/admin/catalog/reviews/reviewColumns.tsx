"use client";
/** Column definitions for the reviews moderation table. */
import Link from "next/link";
import type { Column } from "@/components/admin/DataTable";
import { IconButton } from "@/components/admin/IconButton";
import { TrashIcon } from "@/components/admin/icons";
import { cx, focusRing } from "@/components/admin/styles";
import { formatDate } from "@/lib/admin/format";
import type { AdminReview } from "@/lib/admin/types";
import { Stars } from "../../shared/Stars";

const link = cx("rounded font-semibold text-ink underline-offset-4 hover:underline", focusRing);

export function reviewColumns(opts: { onOpen: (r: AdminReview) => void; onDelete: (r: AdminReview) => void }): Column<AdminReview>[] {
  return [
    {
      id: "product",
      header: "Product",
      rowHeader: true,
      cell: (r) => (
        <span className="block min-w-40">
          <Link href={`/admin/products/${r.product.id}/edit`} className={cx(link, "line-clamp-2")}>
            {r.product.name}
          </Link>
          <span className="block font-mono text-xs text-ink/50">{r.product.code}</span>
        </span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      hideBelow: "md",
      cell: (r) => (
        <span className="block">
          <span className="block text-ink">{r.user.fullName}</span>
          <span className="block text-xs text-ink/50">{r.user.email}</span>
        </span>
      ),
    },
    { id: "rating", header: "Rating", sort: { asc: "rating_asc", desc: "rating_desc", first: "desc" }, cell: (r) => <Stars rating={r.rating} /> },
    {
      id: "comment",
      header: "Review",
      cell: (r) => (
        <button
          type="button"
          onClick={() => opts.onOpen(r)}
          className={cx("block min-w-48 max-w-md rounded text-left text-ink/75 hover:text-ink", focusRing)}
          aria-label={`Read review by ${r.user.fullName} of ${r.product.name}`}
        >
          <span className="line-clamp-2">{r.comment?.trim() || <em className="text-ink/40">Rating only, no comment</em>}</span>
          <span className="mt-0.5 block text-xs font-semibold text-sage-700">Read more</span>
        </button>
      ),
    },
    {
      id: "date",
      header: "Date",
      hideBelow: "sm",
      sort: { asc: "createdAt_asc", desc: "createdAt_desc", first: "desc" },
      cell: (r) => <span className="whitespace-nowrap text-ink/60">{formatDate(r.createdAt)}</span>,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      // sr-only is absolutely positioned; keep it inside the scrolling table so it can't widen the page.
      headerClassName: "relative",
      align: "right",
      cell: (r) => (
        <IconButton label={`Delete review by ${r.user.fullName}`} variant="danger" onClick={() => opts.onDelete(r)}>
          <TrashIcon />
        </IconButton>
      ),
    },
  ];
}
