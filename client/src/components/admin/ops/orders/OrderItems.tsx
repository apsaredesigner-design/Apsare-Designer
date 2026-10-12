/** Order line items (snapshot image, name, variant, qty, price) and the price breakdown. */
import { formatINR, formatNumber } from "@/lib/admin/format";
import type { AdminOrder } from "@/lib/admin/types";
import { Row, Section } from "../../shared/Section";
import { Thumb } from "../../shared/Thumb";

export function OrderItems({ order }: { order: AdminOrder }) {
  const qty = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Section title={`Items (${formatNumber(qty)})`}>
      <ul className="divide-y divide-ink/10">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 first:pt-0">
            <Thumb src={item.imageUrl} alt={item.productName} className="h-20 w-16" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{item.productName}</p>
              <p className="mt-0.5 font-mono text-xs text-ink/50">{item.productCode}</p>
              <p className="mt-1 text-xs text-ink/65">
                {item.size} · {item.color} · Qty {formatNumber(item.quantity)}
              </p>
            </div>
            <div className="text-right text-sm tabular-nums">
              <p className="font-semibold">{formatINR(item.salePrice * item.quantity)}</p>
              <p className="text-xs text-ink/55">{formatINR(item.salePrice)} each</p>
              {item.mrp > item.salePrice && <p className="text-xs text-ink/40 line-through">{formatINR(item.mrp)}</p>}
            </div>
          </li>
        ))}
      </ul>
      <PriceBreakdown order={order} />
    </Section>
  );
}

export function PriceBreakdown({ order }: { order: AdminOrder }) {
  return (
    <dl className="mt-4 border-t border-ink/10 pt-4">
      <Row label="Total MRP">{formatINR(order.totalMrp)}</Row>
      <Row label="Discount on MRP">−{formatINR(order.totalDiscount)}</Row>
      {order.couponDiscount > 0 && (
        <Row label={`Coupon${order.coupon ? ` (${order.coupon.code})` : ""}`}>−{formatINR(order.couponDiscount)}</Row>
      )}
      <Row label={order.paymentMethod === "COD" ? "Delivery (incl. COD fee)" : "Delivery"}>
        {order.deliveryCharge > 0 ? formatINR(order.deliveryCharge) : "Free"}
      </Row>
      <div className="mt-2 flex justify-between gap-4 border-t border-ink/10 pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatINR(order.finalAmount)}</dd>
      </div>
    </dl>
  );
}
