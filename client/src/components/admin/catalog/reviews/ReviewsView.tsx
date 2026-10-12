"use client";
/**
 * /admin/reviews: moderation table with search (product, customer, comment), a
 * rating filter, sorting, a detail drawer and delete (the product's rating is
 * recalculated by the server). Render inside <Suspense>.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { CloseIcon, StarIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { formatNumber } from "@/lib/admin/format";
import { adminApi } from "@/lib/admin/api";
import { REVIEW_FILTERS, REVIEWS_PATH } from "@/lib/admin/helpers/reviews";
import type { AdminReview } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useMutation } from "@/lib/admin/use-mutation";
import { ReviewDrawer } from "./ReviewDrawer";
import { reviewColumns } from "./reviewColumns";

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "3", label: "3 stars" },
  { value: "2", label: "2 stars" },
  { value: "1", label: "1 star" },
  { value: "high", label: "4 stars and up" },
  { value: "low", label: "2 stars and below" },
];

const RATING_PARAMS: Record<string, Record<string, string | null>> = {
  "": { rating: null, minRating: null, maxRating: null },
  high: { rating: null, minRating: "4", maxRating: null },
  low: { rating: null, minRating: null, maxRating: "2" },
};

export function ReviewsView() {
  const list = useAdminList<AdminReview>(REVIEWS_PATH, { filters: REVIEW_FILTERS, defaultSort: "createdAt_desc" });
  const [open, setOpen] = useState<AdminReview | null>(null);
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);

  const f = list.filters;
  const ratingValue = f.rating || (f.minRating === "4" && !f.maxRating ? "high" : f.maxRating === "2" && !f.minRating ? "low" : "");
  const setRating = (v: string | null) =>
    list.setFilters(RATING_PARAMS[v ?? ""] ?? { rating: v, minRating: null, maxRating: null });

  const del = useMutation((id: number) => adminApi.reviews.remove(id), {
    success: "Review deleted. The product's rating was recalculated.",
    onSuccess: () => {
      setToDelete(null);
      setOpen(null);
      list.reload();
    },
  });

  const columns = reviewColumns({ onOpen: setOpen, onDelete: setToDelete });

  return (
    <>
      <PageHeader
        title="Reviews"
        description={list.meta ? `${formatNumber(list.meta.total)} review${list.meta.total === 1 ? "" : "s"}${list.hasActiveFilters ? " match" : ""}. Reviews can't be edited, only removed.` : "Moderate customer reviews."}
      />
      <FilterBar
        search={<SearchInput label="Search reviews" placeholder="Product, customer or comment" value={list.search} onChange={list.setSearch} />}
        active={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect label="Rating" value={ratingValue} onChange={setRating} options={RATING_OPTIONS} />
        {(f.productId || f.userId) && (
          <div className="flex items-end">
            <Button
              variant="secondary"
              size="sm"
              icon={<CloseIcon />}
              onClick={() => list.setFilters({ productId: null, userId: null })}
              aria-label="Remove product/customer filter"
            >
              {f.productId ? `Product #${f.productId}` : `Customer #${f.userId}`}
            </Button>
          </div>
        )}
      </FilterBar>
      <DataTable
        caption="Reviews"
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSortChange={list.setSort}
        empty={
          list.hasActiveFilters ? (
            <EmptyState compact title="No reviews match" action={<Button variant="secondary" onClick={list.clearFilters}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={<StarIcon />} title="No reviews yet" description="Customer reviews will appear here once they're posted." />
          )
        }
        footer={list.meta && list.meta.total > 0 ? <Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} /> : undefined}
      />

      <ReviewDrawer review={open} onClose={() => setOpen(null)} onDelete={setToDelete} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this review?"
        description={
          toDelete
            ? `${toDelete.user.fullName}'s ${toDelete.rating}-star review of “${toDelete.product.name}” will be removed permanently. The product's average rating and review count are recalculated.`
            : undefined
        }
        confirmLabel="Delete review"
        tone="danger"
        loading={del.pending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
