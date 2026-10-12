"use client";
/** Admin customer detail: stats, profile with account actions, and full order history. */
import { ButtonLink } from "@/components/admin/Button";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/Skeleton";
import type { AdminCustomerDetail } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { LoadError } from "../../shared/LoadError";
import { AccountActions } from "./AccountActions";
import { CustomerOrders } from "./CustomerOrders";
import { CustomerProfile } from "./CustomerProfile";
import { CustomerStats } from "./CustomerStats";

export function CustomerDetailView({ id }: { id: number }) {
  const { data: c, error, reload, setData } = useAdminQuery<AdminCustomerDetail>(`/admin/customers/${id}`);
  const crumbs = [{ label: "Customers", href: "/admin/customers" }, { label: c?.fullName ?? `#${id}` }];

  if (error && !c) {
    return (
      <>
        <PageHeader title="Customer" breadcrumbs={crumbs} />
        <LoadError title="Couldn't load this customer" error={error} onRetry={reload} action={<ButtonLink href="/admin/customers" variant="secondary">Back to customers</ButtonLink>} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={c?.fullName ?? "Customer"} breadcrumbs={crumbs} description={c ? `Customer #${c.id}` : "Loading…"} />
      <CustomerStats stats={c?.stats} />
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0">
          {c ? (
            <CustomerProfile
              customer={c}
              actions={<AccountActions customer={c} onChanged={(patch) => setData((d) => (d ? { ...d, ...patch } : d))} />}
            />
          ) : (
            <Skeleton className="h-96 rounded-xl" />
          )}
        </div>
        <div className="min-w-0 xl:col-span-2">
          <CustomerOrders userId={id} />
        </div>
      </div>
    </>
  );
}
