"use client";
/**
 * Inline-editable delivery days (1–30). Saves on Enter or blur when changed;
 * Esc reverts. Remount with a new `key` after a save to reset the draft.
 */
import { useState } from "react";
import { Input } from "@/components/admin/Input";

export function DeliveryDaysCell({ pincode, value, onSave, disabled }: { pincode: string; value: number; onSave: (days: number) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  const n = Number(draft);
  const valid = /^\d+$/.test(draft) && n >= 1 && n <= 30;

  const commit = () => {
    if (!valid) return setDraft(String(value));
    if (n !== value) onSave(n);
  };

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={30}
      step={1}
      aria-label={`Delivery days for ${pincode}`}
      title="1 to 30 days. Enter to save, Esc to undo."
      value={draft}
      invalid={!valid}
      disabled={disabled}
      className="w-20 text-right tabular-nums"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          setDraft(String(value));
        }
      }}
    />
  );
}
