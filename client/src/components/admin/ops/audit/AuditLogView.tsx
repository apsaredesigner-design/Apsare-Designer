"use client";
/** Admin audit log: every admin write, newest first, filtered by admin and IST date range. */
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { HistoryIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Badge } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin/format";
import { AUDIT_FILTERS, METHOD_TONE, httpStatusTone } from "@/lib/admin/helpers/audit";
import type { AdminCustomer, AuditLogEntry, Paginated } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { DateRangeFilter } from "../../shared/DateRangeFilter";

const columns: Column<AuditLogEntry>[] = [
  {
    id: "time",
    header: "Time",
    cell: (e) => <time dateTime={e.createdAt} className="whitespace-nowrap text-ink/70">{formatDateTime(e.createdAt)}</time>,
  },
  {
    id: "admin",
    header: "Admin",
    hideBelow: "md",
    cell: (e) => (
      <span className="flex flex-col">
        <span>{e.admin.fullName}</span>
        <span className="text-xs break-all text-ink/50">{e.admin.email}</span>
      </span>
    ),
  },
  {
    id: "action",
    header: "Action",
    rowHeader: true,
    cell: (e) => (
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge tone={METHOD_TONE[e.method] ?? "neutral"} dot={false}><span className="font-mono">{e.method}</span></Badge>
        <span className="font-mono text-xs break-all text-ink/80">{e.path.replace(/^\/api\/admin/, "")}</span>
      </span>
    ),
  },
  { id: "status", header: "Status", align: "right", cell: (e) => <Badge tone={httpStatusTone(e.status)} dot={false}><span className="tabular-nums">{e.status}</span></Badge> },
  { id: "target", header: "Target", hideBelow: "sm", cell: (e) => <span className="font-mono text-xs text-ink/65">{e.targetId ?? "—"}</span> },
  { id: "ip", header: "IP", hideBelow: "lg", cell: (e) => <span className="font-mono text-xs text-ink/50">{e.ip ?? "—"}</span> },
];

export function AuditLogView() {
  const list = useAdminList<AuditLogEntry>("/admin/audit-log", { filters: AUDIT_FILTERS });
  const admins = useAdminQuery<Paginated<AdminCustomer>>("/admin/customers?role=ADMIN&limit=100&sort=fullName_asc");

  return (
    <>
      <PageHeader title="Audit log" description="Every change made in the admin panel: who, what and when. Request bodies are never stored." />
      <FilterBar active={list.hasActiveFilters} onClear={list.clearFilters}>
        <FilterSelect
          label="Admin"
          value={list.filters.adminId}
          onChange={(v) => list.setFilter("adminId", v)}
          options={[{ value: "", label: "All admins" }, ...(admins.data?.items ?? []).map((a) => ({ value: String(a.id), label: a.fullName }))]}
        />
        <DateRangeFilter from={list.filters.from} to={list.filters.to} onChange={list.setFilters} />
      </FilterBar>
      <DataTable
        caption="Audit log entries"
        columns={columns}
        rows={list.items}
        rowKey={(e) => e.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty={<EmptyState icon={<HistoryIcon />} title={list.hasActiveFilters ? "No entries match" : "No admin activity yet"} />}
        footer={<Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />}
      />
    </>
  );
}
