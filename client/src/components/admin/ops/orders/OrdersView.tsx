"use client";
/**
 * Admin orders list: status tabs, search, payment/date filters, sortable DataTable,
 * pagination and a CSV export that carries the current filters.
 */
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { ReceiptIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { ORDER_FILTERS, PAYMENT_METHOD_TEXT, PAYMENT_METHODS } from "@/lib/admin/helpers/orders";
import type { AdminOrderListItem } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { DateRangeFilter } from "../../shared/DateRangeFilter";
import { ExportCsvLink } from "./ExportCsvLink";
import { orderColumns } from "./orderColumns";
import { StatusTabs } from "./StatusTabs";

const columns = orderColumns();
const PAYMENT_STATUS = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export function OrdersView() {
  const list = useAdminList<AdminOrderListItem>("/admin/orders", { filters: ORDER_FILTERS, defaultSort: "createdAt_desc" });
  const f = list.filters;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order placed in the store. Open one to update its status or print an invoice."
        actions={<ExportCsvLink query={{ q: list.q, sort: list.sort, ...f }} />}
      />
      <StatusTabs value={f.status} onChange={(s) => list.setFilter("status", s)} />
      <FilterBar
        search={<SearchInput label="Search orders" placeholder="Order no., name, email or mobile" value={list.search} onChange={list.setSearch} />}
        active={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="Payment method"
          value={f.paymentMethod}
          onChange={(v) => list.setFilter("paymentMethod", v)}
          options={[{ value: "", label: "Any method" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_TEXT[m] }))]}
        />
        <FilterSelect
          label="Payment status"
          value={f.paymentStatus}
          onChange={(v) => list.setFilter("paymentStatus", v)}
          options={[{ value: "", label: "Any status" }, ...PAYMENT_STATUS.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))]}
        />
        <DateRangeFilter from={f.from} to={f.to} onChange={list.setFilters} />
      </FilterBar>
      <DataTable
        caption="Orders"
        columns={columns}
        rows={list.items}
        rowKey={(o) => o.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSortChange={list.setSort}
        empty={
          <EmptyState
            icon={<ReceiptIcon />}
            title={list.hasActiveFilters ? "No orders match" : "No orders yet"}
            description={list.hasActiveFilters ? "Try a different status, date range or search." : "Orders will appear here as customers check out."}
          />
        }
        footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />}
      />
    </>
  );
}
