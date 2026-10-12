"use client";
/**
 * Admin order detail: items and price breakdown, status timeline with the update form,
 * customer, address and payment, and a link to the printable invoice.
 */
import { ButtonLink } from "@/components/admin/Button";
import { ReceiptIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/Skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin/format";
import { orderPath } from "@/lib/admin/helpers/orders";
import type { AdminOrder } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { LoadError } from "../../shared/LoadError";
import { Section } from "../../shared/Section";
import { AddressCard, CustomerCard, PaymentCard } from "./OrderInfoCards";
import { OrderItems } from "./OrderItems";
import { OrderTimeline } from "./OrderTimeline";
import { StatusUpdateForm } from "./StatusUpdateForm";

export function OrderDetailView({ orderNumber }: { orderNumber: string }) {
  const { data: order, loading, error, reload, setData } = useAdminQuery<AdminOrder>(orderPath(orderNumber));
  const crumbs = [{ label: "Orders", href: "/admin/orders" }, { label: orderNumber }];

  if (error && !order) {
    return (
      <>
        <PageHeader title={`Order ${orderNumber}`} breadcrumbs={crumbs} />
        <LoadError title="Couldn't load this order" error={error} onRetry={reload} action={<ButtonLink href="/admin/orders" variant="secondary">Back to orders</ButtonLink>} />
      </>
    );
  }

  return (
    <div aria-busy={loading || undefined}>
      <PageHeader
        title={<span className="font-mono text-3xl tracking-wide sm:text-4xl">{orderNumber}</span>}
        breadcrumbs={crumbs}
        description={order ? <span className="inline-flex flex-wrap items-center gap-2">Placed {formatDateTime(order.createdAt)} <StatusBadge status={order.status} /></span> : "Loading…"}
        actions={
          <ButtonLink href={`/admin/orders/${encodeURIComponent(orderNumber)}/invoice`} variant="secondary" icon={<ReceiptIcon />}>
            Invoice
          </ButtonLink>
        }
      />
      {!order ? (
        <div role="status" aria-label="Loading order" className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <OrderItems order={order} />
            <div className="grid gap-6 md:grid-cols-2">
              <AddressCard order={order} />
              <PaymentCard order={order} />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Section title="Update status">
              <StatusUpdateForm order={order} onUpdated={(o) => setData(() => o)} onConflict={reload} />
            </Section>
            <Section title="Timeline">
              <OrderTimeline history={order.statusHistory} />
            </Section>
            <CustomerCard order={order} />
          </div>
        </div>
      )}
    </div>
  );
}
