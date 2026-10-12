"use client";
/** Admin customers list: search, active and role filters, sortable, paginated. */
import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { UsersIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { Badge } from "@/components/admin/StatusBadge";
import { formatDate, formatINR, formatNumber } from "@/lib/admin/format";
import type { AdminCustomer } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { linkClass } from "../orders/orderColumns";

const columns: Column<AdminCustomer>[] = [
  {
    id: "name",
    header: "Customer",
    rowHeader: true,
    sort: { asc: "fullName_asc", desc: "fullName_desc" },
    cell: (c) => (
      <span className="flex flex-col">
        <Link href={`/admin/customers/${c.id}`} className={linkClass}>{c.fullName}</Link>
        <span className="text-xs break-all text-ink/55">{c.email}</span>
      </span>
    ),
  },
  { id: "mobile", header: "Mobile", hideBelow: "lg", cell: (c) => <span className="tabular-nums text-ink/70">{c.mobile}</span> },
  { id: "orders", header: "Orders", align: "right", sort: { desc: "orders_desc" }, cell: (c) => <span className="tabular-nums">{formatNumber(c.orderCount)}</span> },
  { id: "spent", header: "Total spent", align: "right", hideBelow: "sm", cell: (c) => <span className="font-semibold tabular-nums">{formatINR(c.totalSpent)}</span> },
  {
    id: "joined",
    header: "Joined",
    hideBelow: "md",
    sort: { asc: "createdAt_asc", desc: "createdAt_desc", first: "desc" },
    cell: (c) => <span className="whitespace-nowrap text-ink/65">{formatDate(c.createdAt)}</span>,
  },
  {
    id: "status",
    header: "Status",
    cell: (c) => (
      <span className="flex flex-wrap gap-1">
        <Badge tone={c.isActive ? "success" : "danger"}>{c.isActive ? "Active" : "Disabled"}</Badge>
        {c.role === "ADMIN" && <Badge tone="gold">Admin</Badge>}
      </span>
    ),
  },
];

export function CustomersView() {
  const list = useAdminList<AdminCustomer>("/admin/customers", { filters: ["isActive", "role"], defaultSort: "createdAt_desc" });
  const admins = list.filters.role === "ADMIN";

  return (
    <>
      <PageHeader title="Customers" description="Registered accounts, their orders and lifetime spend." />
      <FilterBar
        search={<SearchInput label="Search customers" placeholder="Name, email or mobile" value={list.search} onChange={list.setSearch} />}
        active={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="Status"
          value={list.filters.isActive}
          onChange={(v) => list.setFilter("isActive", v)}
          options={[{ value: "", label: "Any" }, { value: "true", label: "Active" }, { value: "false", label: "Disabled" }]}
        />
        <FilterSelect
          label="Role"
          value={list.filters.role}
          onChange={(v) => list.setFilter("role", v)}
          options={[{ value: "", label: "Customers" }, { value: "ADMIN", label: "Admins" }]}
        />
      </FilterBar>
      <DataTable
        caption={admins ? "Admins" : "Customers"}
        columns={columns}
        rows={list.items}
        rowKey={(c) => c.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSortChange={list.setSort}
        empty={
          <EmptyState
            icon={<UsersIcon />}
            title={list.hasActiveFilters ? "No one matches" : "No customers yet"}
            description={list.hasActiveFilters ? "Try another search or filter." : "Customers appear here after they sign up."}
          />
        }
        footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />}
      />
    </>
  );
}
