"use client";
/**
 * Bulk add pincodes: paste comma/newline-separated codes, preview valid vs invalid
 * (6 digits, first digit 1–9), then POST /settings/pincodes/bulk with the valid ones.
 */
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/admin/Button";
import { Checkbox } from "@/components/admin/Checkbox";
import { FormField } from "@/components/admin/FormField";
import { Input } from "@/components/admin/Input";
import { Modal } from "@/components/admin/Modal";
import { Badge } from "@/components/admin/StatusBadge";
import { Textarea } from "@/components/admin/Textarea";
import { formatNumber } from "@/lib/admin/format";
import { adminApi } from "@/lib/admin/api";
import { BULK_PINCODE_MAX, parsePincodes } from "@/lib/admin/helpers/settings";
import { useMutation } from "@/lib/admin/use-mutation";

export function BulkPincodesModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [days, setDays] = useState("5");
  const [cod, setCod] = useState(true);
  const parsed = useMemo(() => parsePincodes(text), [text]);
  const d = Number(days);
  const daysOk = /^\d+$/.test(days) && d >= 1 && d <= 30;
  const tooMany = parsed.valid.length > BULK_PINCODE_MAX;

  const bulk = useMutation(() => adminApi.settings.pincodes.bulk(parsed.valid.map((pincode) => ({ pincode, deliveryDays: d, codAvailable: cod }))), {
    success: (r) => `${formatNumber(r.added)} added, ${formatNumber(r.skipped)} already listed`,
    onSuccess: () => { setText(""); onAdded(); onClose(); },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissible={!bulk.pending}
      title="Bulk add pincodes"
      description="Paste pincodes separated by commas, spaces or new lines. Ones already listed are skipped, not changed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={bulk.pending}>Cancel</Button>
          <Button type="submit" form={id} loading={bulk.pending} disabled={parsed.valid.length === 0 || !daysOk || tooMany}>
            Add {formatNumber(parsed.valid.length)} pincode{parsed.valid.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <form id={id} noValidate onSubmit={(e) => { e.preventDefault(); void bulk.mutate(); }} className="flex flex-col gap-4">
        <FormField label="Pincodes" hint={`Up to ${formatNumber(BULK_PINCODE_MAX)} at a time`}>
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"560001, 560002\n110001"} className="font-mono" />
        </FormField>
        <div className="grid grid-cols-2 items-end gap-3">
          <FormField label="Delivery days" error={daysOk ? null : "1 to 30"}>
            <Input type="number" inputMode="numeric" min={1} max={30} step={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </FormField>
          <Checkbox label="COD available" checked={cod} onChange={(e) => setCod(e.target.checked)} />
        </div>
        <section aria-label="Preview" aria-live="polite" className="rounded-md border border-ink/10 p-3 text-sm">
          <p className="flex flex-wrap gap-2">
            <Badge tone="success">{formatNumber(parsed.valid.length)} valid</Badge>
            <Badge tone={parsed.invalid.length ? "danger" : "neutral"}>{formatNumber(parsed.invalid.length)} invalid</Badge>
            {parsed.duplicates > 0 && <Badge tone="neutral">{formatNumber(parsed.duplicates)} repeated</Badge>}
          </p>
          {tooMany && <p role="alert" className="mt-2 text-sale">Too many: split into batches of {formatNumber(BULK_PINCODE_MAX)}.</p>}
          {parsed.invalid.length > 0 && (
            <p className="mt-2 text-ink/70">
              Skipped as invalid (6 digits, first digit 1–9):{" "}
              <span className="font-mono break-all text-sale">{parsed.invalid.slice(0, 30).join(", ")}{parsed.invalid.length > 30 ? " …" : ""}</span>
            </p>
          )}
          {parsed.valid.length > 0 && (
            <p className="mt-2 font-mono text-xs break-all text-ink/60">{parsed.valid.slice(0, 40).join(", ")}{parsed.valid.length > 40 ? ` … +${parsed.valid.length - 40}` : ""}</p>
          )}
        </section>
      </form>
    </Modal>
  );
}
