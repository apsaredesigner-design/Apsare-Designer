"use client";
/**
 * Product form → Pricing: whole-rupee MRP and sale price, with a live discount preview
 * (the server computes the stored discountPercent with the same formula).
 */
import { FormField } from "@/components/admin/FormField";
import { Input } from "@/components/admin/Input";
import { formatINR } from "@/lib/admin/format";
import { discountPercent } from "@/lib/pricing";
import { digits, type FormErrors, type ProductValues } from "./model";
import { Section } from "../../shared/Section";

export function PricingSection({
  values,
  set,
  errors,
}: {
  values: ProductValues;
  set: (key: "mrp" | "salePrice", value: string) => void;
  errors: FormErrors;
}) {
  const mrp = Number(values.mrp);
  const sale = Number(values.salePrice);
  const both = values.mrp !== "" && values.salePrice !== "" && mrp > 0 && sale > 0;
  const tooHigh = both && sale > mrp;
  const pct = both && !tooHigh ? discountPercent(mrp, sale) : 0;
  const saleError = errors.salePrice ?? (tooHigh ? "Sale price cannot exceed MRP" : undefined);

  return (
    <Section id="pricing" title="Pricing" description="Whole rupees. The discount is calculated for you.">
      <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
        <FormField label="MRP" name="mrp" errors={errors} required>
          <Input prefix="₹" inputMode="numeric" value={values.mrp} onChange={(e) => set("mrp", digits(e.target.value))} autoComplete="off" />
        </FormField>
        <FormField label="Sale price" name="salePrice" error={saleError} required>
          <Input
            prefix="₹"
            inputMode="numeric"
            value={values.salePrice}
            onChange={(e) => set("salePrice", digits(e.target.value))}
            autoComplete="off"
          />
        </FormField>
        <div className="rounded-lg bg-ivory px-4 py-3" aria-live="polite">
          <p className="text-xs font-semibold tracking-wide text-ink/60">Discount preview</p>
          {both && !tooHigh ? (
            <p className="mt-1 text-sm text-ink">
              <span className="font-display text-2xl font-semibold text-sage-700">{pct}% off</span>
              <span className="block text-xs text-ink/60">
                Customer saves {formatINR(mrp - sale)} · pays {formatINR(sale)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink/50">{tooHigh ? "Fix the sale price to see the discount." : "Enter both prices."}</p>
          )}
        </div>
      </div>
    </Section>
  );
}
