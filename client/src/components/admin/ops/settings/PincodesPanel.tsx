"use client";
/**
 * Serviceable pincodes: search by prefix, COD filter, paginated table with inline
 * delivery days and a COD switch, add one, bulk add, delete.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { IconButton } from "@/components/admin/IconButton";
import { TrashIcon, UploadIcon } from "@/components/admin/icons";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { Switch } from "@/components/admin/Switch";
import { adminApi } from "@/lib/admin/api";
import type { ServiceablePincode } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useMutation } from "@/lib/admin/use-mutation";
import { Section } from "../../shared/Section";
import { AddPincodeForm } from "./AddPincodeForm";
import { BulkPincodesModal } from "./BulkPincodesModal";
import { DeliveryDaysCell } from "./DeliveryDaysCell";

type Patch = { deliveryDays?: number; codAvailable?: boolean };

export function PincodesPanel() {
  const list = useAdminList<ServiceablePincode>("/admin/settings/pincodes", { filters: ["codAvailable"], defaultSort: "pincode_asc" });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const update = useMutation((pincode: string, body: Patch) => adminApi.settings.pincodes.update(pincode, body), {
    success: (p) => `${p.pincode} updated`,
    onSuccess: (p) => list.setItems((items) => items.map((x) => (x.pincode === p.pincode ? p : x))),
    onError: () => list.reload(),
  });
  const del = useMutation((pincode: string) => adminApi.settings.pincodes.remove(pincode), {
    success: "Pincode removed",
    onSuccess: () => { setDeleting(null); list.reload(); },
  });

  const columns: Column<ServiceablePincode>[] = [
    { id: "pincode", header: "Pincode", rowHeader: true, sort: { asc: "pincode_asc", desc: "pincode_desc" }, cell: (p) => <span className="font-mono tracking-wide">{p.pincode}</span> },
    {
      id: "days",
      header: "Delivery days",
      sort: { asc: "deliveryDays_asc" },
      cell: (p) => <DeliveryDaysCell key={`${p.pincode}-${p.deliveryDays}`} pincode={p.pincode} value={p.deliveryDays} onSave={(deliveryDays) => void update.mutate(p.pincode, { deliveryDays })} />,
    },
    { id: "cod", header: "COD", cell: (p) => <Switch size="sm" aria-label={`Cash on delivery for ${p.pincode}`} checked={p.codAvailable} onChange={(codAvailable) => void update.mutate(p.pincode, { codAvailable })} /> },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (p) => <IconButton label={`Remove ${p.pincode}`} variant="danger" onClick={() => setDeleting(p.pincode)}><TrashIcon /></IconButton>,
    },
  ];

  return (
    <Section title="Serviceable pincodes" actions={<Button variant="secondary" size="sm" icon={<UploadIcon />} onClick={() => setBulkOpen(true)}>Bulk add</Button>}>
      <p className="-mt-2 mb-4 text-sm text-ink/60">Orders can only ship to these pincodes. Cash on delivery also needs COD switched on.</p>
      <div className="mb-6 rounded-lg bg-ivory p-4"><AddPincodeForm onAdded={list.reload} /></div>
      <FilterBar
        search={<SearchInput label="Search pincodes" placeholder="Starts with…" value={list.search} onChange={(v) => list.setSearch(v.replace(/\D/g, ""))} />}
        active={list.hasActiveFilters}
        onClear={list.clearFilters}
      >
        <FilterSelect
          label="COD"
          value={list.filters.codAvailable}
          onChange={(v) => list.setFilter("codAvailable", v)}
          options={[{ value: "", label: "Any" }, { value: "true", label: "COD on" }, { value: "false", label: "COD off" }]}
        />
      </FilterBar>
      <DataTable
        caption="Serviceable pincodes"
        columns={columns}
        rows={list.items}
        rowKey={(p) => p.pincode}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={list.sort}
        onSortChange={list.setSort}
        empty={<EmptyState compact title={list.hasActiveFilters ? "No pincodes match" : "No pincodes yet"} description="Add one above or paste a list with Bulk add." />}
        footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />}
      />
      <BulkPincodesModal open={bulkOpen} onClose={() => setBulkOpen(false)} onAdded={list.reload} />
      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={`Remove pincode ${deleting ?? ""}?`}
        description="Shoppers at this pincode won't be able to check out. Existing orders are not affected."
        confirmLabel="Remove"
        loading={del.pending}
        onConfirm={() => deleting && void del.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Section>
  );
}
