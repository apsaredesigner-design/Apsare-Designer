/** Profile card: contact details, role, status and saved addresses. */
import { Badge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/admin/format";
import type { AdminCustomerDetail } from "@/lib/admin/types";
import { Row, Section } from "../../shared/Section";

export function CustomerProfile({ customer: c, actions }: { customer: AdminCustomerDetail; actions: React.ReactNode }) {
  return (
    <Section title="Profile">
      <dl>
        <Row label="Email"><a href={`mailto:${c.email}`} className="break-all underline-offset-4 hover:underline">{c.email}</a></Row>
        <Row label="Mobile">{c.mobile}</Row>
        <Row label="Role"><Badge tone={c.role === "ADMIN" ? "gold" : "neutral"}>{c.role === "ADMIN" ? "Admin" : "Customer"}</Badge></Row>
        <Row label="Status"><Badge tone={c.isActive ? "success" : "danger"}>{c.isActive ? "Active" : "Disabled"}</Badge></Row>
        <Row label="Joined">{formatDate(c.createdAt)}</Row>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4">{actions}</div>
      <h3 className="mt-6 text-xs font-semibold tracking-[0.14em] text-ink/55 uppercase">Addresses</h3>
      {c.addresses.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No saved addresses.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {c.addresses.map((a) => (
            <li key={a.id} className="rounded-md border border-ink/10 p-3 text-sm leading-relaxed text-ink/75">
              <span className="font-semibold text-ink">{a.fullName}</span>
              {a.isDefault && <Badge tone="info" className="ml-2">Default</Badge>}
              <br />
              {a.line1}
              {a.line2 && `, ${a.line2}`}
              <br />
              {a.city}, {a.state} {a.pincode} · {a.mobile}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
