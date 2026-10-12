/** Customer, shipping address and payment cards for the order detail page. */
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTime, formatINR } from "@/lib/admin/format";
import { PAYMENT_METHOD_TEXT } from "@/lib/admin/helpers/orders";
import type { AdminOrder } from "@/lib/admin/types";
import { Row, Section } from "../../shared/Section";
import { linkClass } from "./orderColumns";

export function CustomerCard({ order }: { order: AdminOrder }) {
  const u = order.user;
  return (
    <Section title="Customer">
      <Link href={`/admin/customers/${u.id}`} className={linkClass}>
        {u.fullName}
      </Link>
      <p className="mt-1 text-sm break-all text-ink/70">
        <a href={`mailto:${u.email}`} className="underline-offset-4 hover:underline">{u.email}</a>
      </p>
      <p className="text-sm text-ink/70">{u.mobile}</p>
      <Link href={`/admin/customers/${u.id}#orders`} className="mt-3 inline-block text-xs font-semibold tracking-wide text-sage-700 underline-offset-4 hover:underline">
        View all their orders
      </Link>
    </Section>
  );
}

export function AddressCard({ order: o }: { order: AdminOrder }) {
  return (
    <Section title="Ship to">
      <address className="text-sm leading-relaxed text-ink/80 not-italic">
        <span className="font-semibold text-ink">{o.shipName}</span>
        <br />
        {o.shipLine1}
        {o.shipLine2 && (<><br />{o.shipLine2}</>)}
        {o.shipLandmark && (<><br />{o.shipLandmark}</>)}
        <br />
        {o.shipCity}, {o.shipState} {o.shipPincode}
        <br />
        Mobile: {o.shipMobile}
      </address>
    </Section>
  );
}

export function PaymentCard({ order: o }: { order: AdminOrder }) {
  return (
    <Section title="Payment" actions={<StatusBadge status={o.paymentStatus} />}>
      <dl>
        <Row label="Method">{PAYMENT_METHOD_TEXT[o.paymentMethod]}</Row>
        <Row label="Amount">{formatINR(o.finalAmount)}</Row>
      </dl>
      {o.payments.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-ink/10 pt-3 text-xs text-ink/65">
          {o.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {p.provider.toUpperCase()} · {formatINR(p.amount)}
                {p.providerRef && <span className="font-mono"> · {p.providerRef}</span>}
                <span className="block">{formatDateTime(p.createdAt)}</span>
              </span>
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
