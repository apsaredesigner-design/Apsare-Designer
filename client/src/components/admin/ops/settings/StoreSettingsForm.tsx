"use client";
/**
 * Store settings form: delivery charge, free-shipping threshold and COD fee (whole
 * rupees), with a live preview of what shoppers will see.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { FormField } from "@/components/admin/FormField";
import { Input } from "@/components/admin/Input";
import { Skeleton } from "@/components/admin/Skeleton";
import { formatDateTime, formatINR } from "@/lib/admin/format";
import { adminApi } from "@/lib/admin/api";
import { parseWhole } from "@/lib/admin/helpers/settings";
import type { StoreSettings, StoreSettingsInput } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { useMutation } from "@/lib/admin/use-mutation";
import { LoadError } from "../../shared/LoadError";
import { Section } from "../../shared/Section";

type Draft = Record<keyof StoreSettingsInput, string>;
const toDraft = (s: StoreSettings): Draft => ({ deliveryCharge: String(s.deliveryCharge), freeShippingThreshold: String(s.freeShippingThreshold), codFee: String(s.codFee) });

export function StoreSettingsForm() {
  const q = useAdminQuery<StoreSettings>("/admin/settings");
  if (q.error && !q.data) return <LoadError title="Couldn't load store settings" error={q.error} onRetry={q.reload} />;
  return (
    <Section title="Delivery & charges" actions={q.data && <span className="text-xs text-ink/50">Updated {formatDateTime(q.data.updatedAt)}</span>}>
      {q.data ? <Form key={q.data.updatedAt} settings={q.data} onSaved={(s) => q.setData(() => s)} /> : <Skeleton className="h-64" />}
    </Section>
  );
}

function Form({ settings, onSaved }: { settings: StoreSettings; onSaved: (s: StoreSettings) => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const save = useMutation((body: StoreSettingsInput) => adminApi.settings.update(body), { success: "Settings saved", onSuccess: onSaved });
  const values = { deliveryCharge: parseWhole(draft.deliveryCharge), freeShippingThreshold: parseWhole(draft.freeShippingThreshold), codFee: parseWhole(draft.codFee) };
  const errors: Record<string, string> = { ...save.fieldErrors };
  if (values.deliveryCharge === null || values.deliveryCharge > 10000) errors.deliveryCharge = "0 to ₹10,000, whole rupees";
  if (values.freeShippingThreshold === null) errors.freeShippingThreshold = "Whole rupees; 0 means always free";
  if (values.codFee === null || values.codFee > 10000) errors.codFee = "0 to ₹10,000, whole rupees";
  const valid = Object.values(values).every((v) => v !== null) && !errors.deliveryCharge && !errors.codFee;
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => values[k] !== settings[k]);

  const field = (k: keyof Draft) => ({
    type: "number" as const,
    inputMode: "numeric" as const,
    min: 0,
    step: 1,
    prefix: "₹",
    value: draft[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value })),
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) void save.mutate(values as StoreSettingsInput);
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Delivery charge" name="deliveryCharge" errors={errors} required>
          <Input {...field("deliveryCharge")} max={10000} />
        </FormField>
        <FormField label="Free shipping from" name="freeShippingThreshold" errors={errors} required>
          <Input {...field("freeShippingThreshold")} />
        </FormField>
        <FormField label="COD fee" name="codFee" errors={errors} required>
          <Input {...field("codFee")} max={10000} />
        </FormField>
      </div>
      <p aria-live="polite" className="rounded-md bg-sage-100/60 px-4 py-3 text-sm text-ink/80">
        {valid ? <Preview {...(values as StoreSettingsInput)} /> : "Fix the fields above to see the preview."}
      </p>
      <div className="flex justify-end">
        <Button type="submit" loading={save.pending} disabled={!valid || !dirty}>Save settings</Button>
      </div>
    </form>
  );
}

function Preview({ deliveryCharge, freeShippingThreshold, codFee }: StoreSettingsInput) {
  const shipping =
    deliveryCharge === 0 || freeShippingThreshold === 0
      ? "Shipping is free on every order."
      : `Free shipping on orders of ${formatINR(freeShippingThreshold)} and above; ${formatINR(deliveryCharge)} delivery below that.`;
  return (
    <>
      <strong className="font-semibold">Shoppers see:</strong> {shipping} {codFee > 0 ? `Cash on delivery adds ${formatINR(codFee)}.` : "No extra fee for cash on delivery."}
    </>
  );
}
