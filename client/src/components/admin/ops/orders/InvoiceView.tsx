"use client";
/**
 * Printable invoice page. The local `@media print` rules hide the admin shell and
 * the toolbar so only the invoice prints, on A4 with no extra margins.
 */
import { Button, ButtonLink } from "@/components/admin/Button";
import { ChevronLeftIcon, ReceiptIcon } from "@/components/admin/icons";
import { Skeleton } from "@/components/admin/Skeleton";
import { orderPath } from "@/lib/admin/helpers/orders";
import type { AdminOrder } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { LoadError } from "../../shared/LoadError";
import { Invoice } from "./Invoice";

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden !important; }
  #order-invoice, #order-invoice * { visibility: visible !important; }
  #order-invoice { position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none; padding: 0; }
  #order-invoice .overflow-x-auto { overflow: visible; }
}`;

export function InvoiceView({ orderNumber }: { orderNumber: string }) {
  const { data, error, reload } = useAdminQuery<AdminOrder>(orderPath(orderNumber));
  const back = `/admin/orders/${encodeURIComponent(orderNumber)}`;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ButtonLink href={back} variant="ghost" icon={<ChevronLeftIcon />}>
          Back to order
        </ButtonLink>
        <Button icon={<ReceiptIcon />} onClick={() => window.print()} disabled={!data}>
          Print invoice
        </Button>
      </div>
      {error && !data ? (
        <LoadError title="Couldn't load this invoice" error={error} onRetry={reload} />
      ) : data ? (
        <div className="rounded-xl border border-ink/10 print:border-0">
          <Invoice order={data} />
        </div>
      ) : (
        <Skeleton className="mx-auto h-[36rem] max-w-3xl rounded-xl" />
      )}
    </>
  );
}
