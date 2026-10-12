/**
 * Section: a white card with an h2 title, used by forms and detail pages alike.
 * Row: a label/value pair inside a <dl> in a Section.
 *
 *   <Section id="pricing" title="Pricing" description="…" actions={<Button …/>} error={errors.images}>…</Section>
 *   <Section title="Totals"><dl><Row label="Subtotal">{formatINR(x)}</Row></dl></Section>
 *
 * `error` renders a section-level alert (marked `data-field-error` so forms can scroll to it).
 */
import { useId, type ReactNode } from "react";
import { card, cx } from "@/components/admin/styles";

export interface SectionProps {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ id, title, description, actions, error, children, className }: SectionProps) {
  const headingId = useId();
  return (
    <section id={id} aria-labelledby={headingId} className={cx(card, "min-w-0 p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-2xl font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {error && (
        <p role="alert" data-field-error className="mb-4 rounded-md bg-sale/5 px-3 py-2 text-sm font-semibold text-sale">
          {error}
        </p>
      )}
      {children}
    </section>
  );
}

/** A label/value row inside a <dl>. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink/60">{label}</dt>
      <dd className="text-right text-ink tabular-nums">{children}</dd>
    </div>
  );
}
