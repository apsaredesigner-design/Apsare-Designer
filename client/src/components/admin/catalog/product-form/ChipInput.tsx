"use client";
/**
 * ChipInput: type a value and press Enter (or Add) to append it; each chip has a
 * remove button. Used for the variant matrix's sizes and colours.
 *
 *   <ChipInput label="Sizes" values={sizes} onChange={setSizes} placeholder="S, M, Free Size" />
 *
 * Commas split the input into several chips; duplicates (case-insensitive) are ignored.
 */
import { useId, useState } from "react";
import { Button } from "@/components/admin/Button";
import { CloseIcon } from "@/components/admin/icons";
import { Input } from "@/components/admin/Input";
import { cx, focusRing } from "@/components/admin/styles";

export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxLength: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = () => {
    const next = [...values];
    for (const part of draft.split(",")) {
      const v = part.trim().slice(0, maxLength);
      if (v && !next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide text-ink/80">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`${label} added`}>
          {values.map((v) => (
            <li key={v} className="inline-flex items-center rounded-full bg-sage-50 pl-3 text-xs font-semibold text-ink ring-1 ring-sage-200">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className={cx("grid size-8 place-items-center rounded-full text-ink/60 hover:text-sale", focusRing)}
              >
                <CloseIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
