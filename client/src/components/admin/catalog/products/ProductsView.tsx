"use client";
/**
 * /admin/products: URL-synced product table with filters, sorting, pagination,
 * an optimistic active switch and bulk actions. Render inside <Suspense>.
 */
import { Button, ButtonLink } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { PlusIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { PRODUCT_FILTERS, PRODUCTS_PATH } from "@/lib/admin/helpers/products";
import type { AdminProductListItem } from "@/lib/admin/types";
import { formatNumber } from "@/lib/admin/format";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useSelection } from "@/lib/admin/use-selection";
import { useCategoryTree } from "../../shared/useCategoryTree";
import { useBulkActions } from "./useBulkActions";
import { productColumns } from "./productColumns";
import { ProductFilters } from "./ProductFilters";
import { useActiveToggle } from "./useActiveToggle";

const getId = (p: AdminProductListItem) => p.id;

export function ProductsView() {
  const list = useAdminList<AdminProductListItem>(PRODUCTS_PATH, { filters: PRODUCT_FILTERS, defaultSort: "createdAt_desc" });
  const sel = useSelection(list.items, getId);
  const categories = useCategoryTree();
  const active = useActiveToggle(list.setItems);
  const bulk = useBulkActions(list.items, () => {
    sel.clear();
    list.reload();
  });
  const columns = productColumns({ onToggleActive: active.toggle, busyIds: active.busyIds });

  const newButton = (
    <ButtonLink href="/admin/products/new" icon={<PlusIcon />}>
      New product
    </ButtonLink>
  );

  return (
    <>
      <PageHeader
        title="Products"
        description={list.meta ? `${formatNumber(list.meta.total)} product${list.meta.total === 1 ? "" : "s"}${list.hasActiveFilters ? " match" : " in the catalogue"}.` : "Your catalogue, stock and visibility."}
        actions={newButton}
      />
      <ProductFilters list={list} categories={categories.flat} />
      <DataTable
        caption="Products"
        columns={columns}
        rows={list.items}
        rowKey={getId}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSortChange={list.setSort}
        selectable
        selectedIds={sel.selected}
        onSelectionChange={sel.setSelected}
        rowLabel={(p) => p.name}
        bulkActions={bulk.buttons(sel.selected)}
        empty={
          list.hasActiveFilters ? (
            <EmptyState
              compact
              title="No products match"
              description="Try a different search or clear the filters."
              action={<Button variant="secondary" onClick={list.clearFilters}>Clear filters</Button>}
            />
          ) : (
            <EmptyState title="No products yet" description="Add your first piece to start selling." action={newButton} />
          )
        }
        footer={list.meta && list.meta.total > 0 ? <Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} /> : undefined}
      />
      {bulk.dialogs}
    </>
  );
}
