"use client";
/**
 * Admin coupons: state/type/active filters, usage x/limit, create/edit Modal and
 * delete (a used coupon gives 409 COUPON_IN_USE, shown in the dialog).
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { IconButton } from "@/components/admin/IconButton";
import { PlusIcon, TicketIcon, TrashIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { cx, focusRing } from "@/components/admin/styles";
import { errorMessage } from "@/lib/admin/errors";
import { formatINR } from "@/lib/admin/format";
import { adminApi } from "@/lib/admin/api";
import { couponState } from "@/lib/admin/helpers/coupons";
import type { AdminCouponListItem } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useMutation } from "@/lib/admin/use-mutation";
import { CouponStateBadge, discountText, usageText, windowText } from "./CouponBadges";
import { CouponFormModal } from "./CouponFormModal";

type Editing = { coupon: AdminCouponListItem | null } | null;

export function CouponsView() {
  const list = useAdminList<AdminCouponListItem>("/admin/coupons", { filters: ["state", "type", "isActive"], defaultSort: "createdAt_desc" });
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<AdminCouponListItem | null>(null);

  const del = useMutation((c: AdminCouponListItem) => adminApi.coupons.remove(c.id), {
    success: "Coupon deleted",
    error: false,
    onSuccess: () => { setDeleting(null); list.reload(); },
  });

  const columns: Column<AdminCouponListItem>[] = [
    {
      id: "code",
      header: "Code",
      rowHeader: true,
      sort: { asc: "code_asc" },
      cell: (c) => (
        <button type="button" onClick={() => setEditing({ coupon: c })} className={cx("rounded text-left", focusRing)} aria-label={`Edit coupon ${c.code}`}>
          <span className="block font-mono text-sm font-semibold tracking-wide text-ink underline-offset-4 hover:underline">{c.code}</span>
          <span className="block text-xs text-ink/55">{discountText(c)}</span>
        </button>
      ),
    },
    {
      id: "rules",
      header: "Rules",
      hideBelow: "lg",
      cell: (c) => (
        <span className="text-xs text-ink/65">
          {c.minOrderAmount > 0 ? `Min ${formatINR(c.minOrderAmount)}` : "No minimum"}
          {c.perUserLimit && ` · ${c.perUserLimit}/customer`}
          {c.firstOrderOnly && " · First order"}
        </span>
      ),
    },
    { id: "usage", header: "Used", align: "right", sort: { desc: "usedCount_desc" }, cell: (c) => <span className="tabular-nums whitespace-nowrap">{usageText(c)}</span> },
    { id: "window", header: "Valid", hideBelow: "md", sort: { asc: "expiresAt_asc" }, cell: (c) => <span className="text-xs text-ink/65">{windowText(c)}</span> },
    { id: "state", header: "State", cell: (c) => <CouponStateBadge state={couponState(c, now)} /> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (c) => (
        <IconButton label={`Delete ${c.code}`} variant="danger" onClick={() => { del.reset(); setDeleting(c); }}>
          <TrashIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes shoppers apply at checkout."
        actions={<Button icon={<PlusIcon />} onClick={() => setEditing({ coupon: null })}>New coupon</Button>}
      />
      <FilterBar
        search={<SearchInput label="Search coupons" placeholder="Code or description" value={list.search} onChange={list.setSearch} />}
        active={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="State"
          value={list.filters.state}
          onChange={(v) => list.setFilter("state", v)}
          options={[{ value: "", label: "Any" }, { value: "live", label: "Live" }, { value: "scheduled", label: "Scheduled" }, { value: "expired", label: "Expired" }]}
        />
        <FilterSelect
          label="Type"
          value={list.filters.type}
          onChange={(v) => list.setFilter("type", v)}
          options={[{ value: "", label: "Any" }, { value: "PERCENT", label: "Percent" }, { value: "FLAT", label: "Flat" }]}
        />
        <FilterSelect
          label="Active"
          value={list.filters.isActive}
          onChange={(v) => list.setFilter("isActive", v)}
          options={[{ value: "", label: "Any" }, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
        />
      </FilterBar>
      <DataTable
        caption="Coupons"
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
            icon={<TicketIcon />}
            title={list.hasActiveFilters ? "No coupons match" : "No coupons yet"}
            action={!list.hasActiveFilters && <Button onClick={() => setEditing({ coupon: null })}>Create a coupon</Button>}
          />
        }
        footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />}
      />
      {editing && (
        <CouponFormModal
          key={editing.coupon?.id ?? "new"}
          coupon={editing.coupon}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); list.reload(); }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={`Delete coupon ${deleting?.code ?? ""}?`}
        description="Shoppers won't be able to apply it. A coupon already used on orders can't be deleted; deactivate it instead."
        confirmLabel="Delete"
        loading={del.pending}
        onConfirm={() => deleting && void del.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      >
        {del.error && (
          <p role="alert" className="mt-3 rounded-md bg-sale/10 px-3 py-2 text-sm text-sale">
            {errorMessage(del.error)}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
