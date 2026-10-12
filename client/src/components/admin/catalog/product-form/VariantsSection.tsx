"use client";
/**
 * Product form → Variants: a size × colour matrix builder. Add sizes and colours,
 * "Generate rows" adds every missing combination (existing rows are kept), then edit
 * each row. SKUs follow code-size-colour until the admin edits them.
 *
 * Removing a saved variant is allowed here, but the server refuses (409) if that
 * variant has orders; the form then shows the server's message.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { PlusIcon, WarningIcon } from "@/components/admin/icons";
import { PRODUCT_LIMITS } from "@/lib/admin/helpers/products";
import { ChipInput } from "./ChipInput";
import { newVariant, type FormErrors, type VariantRow } from "./model";
import { Section } from "../../shared/Section";
import { VariantRowsTable } from "./VariantRowsTable";

const uniq = (list: string[]) => list.filter((v, i) => list.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

export function VariantsSection({
  code,
  rows,
  onChange,
  errors,
  conflict,
}: {
  code: string;
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  errors: FormErrors;
  /** A 409 message from the last save (variant with orders, duplicate SKU). */
  conflict?: string;
}) {
  const [sizes, setSizes] = useState(() => uniq(rows.map((r) => r.size)));
  const [colors, setColors] = useState(() => uniq(rows.map((r) => r.color)));
  const [removedSaved, setRemovedSaved] = useState<string[]>([]);

  const combos = sizes.flatMap((s) => colors.map((c) => [s, c] as const));
  const has = (s: string, c: string) => rows.some((r) => r.size.toLowerCase() === s.toLowerCase() && r.color.toLowerCase() === c.toLowerCase());
  const missing = combos.filter(([s, c]) => !has(s, c));
  const room = PRODUCT_LIMITS.variants - rows.length;

  const generate = () => onChange([...rows, ...missing.slice(0, room).map(([s, c]) => newVariant(code, s, c))]);
  const patch = (i: number, p: Partial<VariantRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const remove = (i: number) => {
    const row = rows[i];
    if (row.id) setRemovedSaved((list) => [...list, row.sku]);
    onChange(rows.filter((_, j) => j !== i));
  };

  const listError = errors.variants ?? errors.sku;

  return (
    <Section
      id="variants"
      title="Variants"
      description="Every size and colour you sell, with its own SKU and stock."
      error={conflict ?? listError}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ChipInput label="Sizes" values={sizes} onChange={setSizes} maxLength={30} placeholder="e.g. S, M, L or Free Size" />
        <ChipInput label="Colours" values={colors} onChange={setColors} maxLength={40} placeholder="e.g. Maroon, Gold" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={<PlusIcon />} onClick={generate} disabled={missing.length === 0 || room <= 0}>
          Generate {missing.length > 0 ? `${Math.min(missing.length, room)} ` : ""}row{missing.length === 1 ? "" : "s"}
        </Button>
        <p className="text-xs text-ink/55">
          {sizes.length} size{sizes.length === 1 ? "" : "s"} × {colors.length} colour{colors.length === 1 ? "" : "s"} · {rows.length}/
          {PRODUCT_LIMITS.variants} rows
        </p>
      </div>

      {removedSaved.length > 0 && (
        <p className="mt-4 flex gap-2 rounded-md bg-gold-300/20 px-3 py-2 text-xs text-ink" role="status">
          <WarningIcon className="mt-px size-4 shrink-0 text-gold-700" />
          <span>
            Removed saved variant{removedSaved.length > 1 ? "s" : ""} {removedSaved.join(", ")}. If a removed variant has orders, saving will
            fail; set its stock to 0 instead.
          </span>
        </p>
      )}

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState compact title="No variants yet" description="Add sizes and colours above, then generate the rows." />
        ) : (
          <VariantRowsTable rows={rows} errors={errors} onChange={patch} onRemove={remove} />
        )}
      </div>
    </Section>
  );
}
