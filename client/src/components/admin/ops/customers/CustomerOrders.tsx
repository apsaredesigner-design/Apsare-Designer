"use client";
/** A customer's full, paginated order history (GET /admin/orders?userId=). */
import { useState } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ReceiptIcon } from "@/components/admin/icons";
import { Pagination } from "@/components/admin/Pagination";
import { toQueryString } from "@/lib/admin/api";
import type { AdminOrderListItem, Paginated } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { orderColumns } from "../orders/orderColumns";
import { Section } from "../../shared/Section";

const columns = orderColumns({ withCustomer: false });

export function CustomerOrders({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState<string | null>(null);
  const q = useAdminQuery<Paginated<AdminOrderListItem>>(`/admin/orders${toQueryString({ userId, page, limit, sort })}`);

  return (
    <div id="orders" className="scroll-mt-24">
      <Section title="Order history">
        <DataTable
          caption="Order history"
          columns={columns}
          rows={q.data?.items ?? []}
          rowKey={(o) => o.id}
          loading={q.loading}
          error={q.error}
          onRetry={q.reload}
          sort={sort ?? "createdAt_desc"}
          onSortChange={(s) => { setSort(s); setPage(1); }}
          skeletonRows={4}
          empty={<EmptyState compact icon={<ReceiptIcon />} title="No orders yet" />}
          footer={<Pagination meta={q.data?.meta} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />}
        />
      </Section>
    </div>
  );
}
