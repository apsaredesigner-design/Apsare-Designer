/**
 * Invoice: a plain, print-first rendering of an order (black on white, no chrome).
 */
import { formatDateTime, formatINR, formatNumber } from "@/lib/admin/format";
import { PAYMENT_METHOD_TEXT } from "@/lib/admin/helpers/orders";
import type { AdminOrder } from "@/lib/admin/types";
import { PriceBreakdown } from "./OrderItems";

export function Invoice({ order: o }: { order: AdminOrder }) {
  return (
    <article id="order-invoice" aria-label={`Invoice for ${o.orderNumber}`} className="mx-auto max-w-3xl bg-white p-6 text-ink sm:p-10">
      <header className="flex flex-col gap-4 border-b border-ink/20 pb-6 sm:flex-row sm:justify-between">
        <div>
          <p className="font-display text-3xl font-semibold">Label Apsáre</p>
          <p className="text-xs tracking-[0.2em] text-ink/60 uppercase">Invoice</p>
        </div>
        <dl className="text-sm sm:text-right">
          <div><dt className="inline text-ink/60">Order </dt><dd className="inline font-mono">{o.orderNumber}</dd></div>
          <div><dt className="inline text-ink/60">Date </dt><dd className="inline">{formatDateTime(o.createdAt)}</dd></div>
          <div><dt className="inline text-ink/60">Payment </dt><dd className="inline">{PAYMENT_METHOD_TEXT[o.paymentMethod]} ({o.paymentStatus.toLowerCase()})</dd></div>
        </dl>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2" aria-label="Parties">
        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-ink/60 uppercase">Bill to</h2>
          <p className="mt-1 text-sm">{o.user.fullName}<br />{o.user.email}<br />{o.user.mobile}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-ink/60 uppercase">Ship to</h2>
          <p className="mt-1 text-sm">
            {o.shipName}<br />{o.shipLine1}
            {o.shipLine2 && <><br />{o.shipLine2}</>}
            {o.shipLandmark && <><br />{o.shipLandmark}</>}
            <br />{o.shipCity}, {o.shipState} {o.shipPincode}<br />{o.shipMobile}
          </p>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">Items</caption>
          <thead>
            <tr className="border-y border-ink/20 text-left text-xs tracking-wide text-ink/60 uppercase">
              <th scope="col" className="py-2 pr-2">Item</th>
              <th scope="col" className="py-2 pr-2 text-right">Qty</th>
              <th scope="col" className="py-2 pr-2 text-right">MRP</th>
              <th scope="col" className="py-2 pr-2 text-right">Price</th>
              <th scope="col" className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-ink/10 align-top">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  {i.productName}
                  <span className="block text-xs text-ink/55">{i.productCode} · {i.size} · {i.color}</span>
                </th>
                <td className="py-2 pr-2 text-right tabular-nums">{formatNumber(i.quantity)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatINR(i.mrp)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatINR(i.salePrice)}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(i.salePrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-xs">
        <PriceBreakdown order={o} />
      </div>
      <p className="mt-10 text-center text-xs text-ink/50">Thank you for shopping with Label Apsáre. All amounts are in Indian rupees.</p>
    </article>
  );
}
