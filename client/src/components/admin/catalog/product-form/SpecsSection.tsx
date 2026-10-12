"use client";
/** Product form → Specs: up to 30 key/value rows (e.g. "Saree length" → "5.5 m"). */
import { Button } from "@/components/admin/Button";
import { IconButton } from "@/components/admin/IconButton";
import { PlusIcon, TrashIcon } from "@/components/admin/icons";
import { cx, fieldBase } from "@/components/admin/styles";
import { PRODUCT_LIMITS } from "@/lib/admin/helpers/products";
import { rowKey, type FormErrors, type SpecRow } from "./model";
import { Section } from "../../shared/Section";

export function SpecsSection({ rows, onChange, errors }: { rows: SpecRow[]; onChange: (rows: SpecRow[]) => void; errors: FormErrors }) {
  const full = rows.length >= PRODUCT_LIMITS.specs;
  const patch = (i: number, p: Partial<SpecRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  return (
    <Section
      id="specs"
      title="Specifications"
      description={`Shown as a table on the product page. ${rows.length}/${PRODUCT_LIMITS.specs} used.`}
      error={errors.specs}
      actions={
        <Button variant="secondary" size="sm" icon={<PlusIcon />} disabled={full} onClick={() => onChange([...rows, { key: rowKey(), name: "", value: "" }])}>
          Add spec
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink/55">No specifications. Add rows like “Blouse piece → Yes”.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const err = errors[`specs.${i}.key`] ?? errors[`specs.${r.name}`];
            const label = r.name.trim() || `row ${i + 1}`;
            return (
              <li key={r.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
                <div className="min-w-0">
                  <input
                    className={cx(fieldBase, "min-h-11")}
                    placeholder="Name"
                    maxLength={PRODUCT_LIMITS.specKey}
                    value={r.name}
                    aria-label={`Spec name, ${label}`}
                    aria-invalid={Boolean(err) || undefined}
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                  {err && <p className="mt-1 text-xs font-semibold text-sale">{err}</p>}
                </div>
                <input
                  className={cx(fieldBase, "col-span-2 row-start-2 min-h-11 sm:col-span-1 sm:row-start-auto")}
                  placeholder="Value"
                  maxLength={PRODUCT_LIMITS.specValue}
                  value={r.value}
                  aria-label={`Spec value, ${label}`}
                  onChange={(e) => patch(i, { value: e.target.value })}
                />
                <IconButton
                  label={`Remove spec ${label}`}
                  variant="danger"
                  className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                >
                  <TrashIcon />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
