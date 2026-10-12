"use client";
/**
 * VariantRowsTable: one editable row per size × colour: SKU (auto-suggested until
 * edited), colour swatch picker, stock and remove. Scrolls horizontally on phones.
 * Errors use the server paths `variants.<i>` and `variants.<i>.<field>`.
 */
import { IconButton } from "@/components/admin/IconButton";
import { TrashIcon } from "@/components/admin/icons";
import { cx, fieldBase } from "@/components/admin/styles";
import { digits, type FormErrors, type VariantRow } from "./model";

const cell = cx(fieldBase, "min-h-11");

function CellError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-semibold text-sale">
      {message}
    </p>
  );
}

export function VariantRowsTable({
  rows,
  errors,
  onChange,
  onRemove,
}: {
  rows: VariantRow[];
  errors: FormErrors;
  onChange: (index: number, patch: Partial<VariantRow>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="relative -mx-5 overflow-x-auto sm:mx-0" role="region" aria-label="Variants" tabIndex={0}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs font-semibold tracking-[0.08em] text-ink/60 uppercase">
            <th scope="col" className="py-2 pr-3 pl-5 sm:pl-0">Variant</th>
            <th scope="col" className="px-3 py-2">SKU</th>
            <th scope="col" className="px-3 py-2">Colour</th>
            <th scope="col" className="w-28 px-3 py-2">Stock</th>
            <th scope="col" className="relative w-14 py-2 pr-5 sm:pr-0"><span className="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const name = `${r.size || "?"} · ${r.color || "?"}`;
            const err = (f: string) => errors[`variants.${i}.${f}`];
            const rowErr = errors[`variants.${i}`];
            const eid = (f: string) => `variant-${r.key}-${f}-err`;
            return (
              <tr key={r.key} className={cx("border-b border-ink/5 align-top last:border-0", rowErr && "bg-sale/5")}>
                <th scope="row" className="py-3 pr-3 pl-5 text-left font-normal sm:pl-0">
                  <span className="block font-semibold text-ink">{name}</span>
                  {!r.id && <span className="text-xs text-sage-700">New</span>}
                  {(rowErr || err("size") || err("color")) && (
                    <p data-field-error className="mt-1 text-xs font-semibold text-sale">
                      {rowErr ?? err("size") ?? err("color")}
                    </p>
                  )}
                </th>
                <td className="min-w-64 px-3 py-3">
                  <input
                    className={cx(cell, "font-mono text-xs uppercase")}
                    value={r.sku}
                    maxLength={64}
                    aria-label={`SKU for ${name}`}
                    aria-invalid={Boolean(err("sku")) || undefined}
                    aria-describedby={err("sku") ? eid("sku") : undefined}
                    onChange={(e) => onChange(i, { sku: e.target.value.toUpperCase(), skuEdited: true })}
                  />
                  <CellError id={eid("sku")} message={err("sku")} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="size-11 shrink-0 cursor-pointer rounded-md border border-ink/15 bg-white p-1"
                      value={r.colorHex || "#d4d4d4"}
                      aria-label={`Colour swatch for ${name}`}
                      onChange={(e) => onChange(i, { colorHex: e.target.value.toUpperCase() })}
                    />
                    <span className="font-mono text-xs text-ink/60">{r.colorHex || "No swatch"}</span>
                  </div>
                  <CellError id={eid("colorHex")} message={err("colorHex")} />
                </td>
                <td className="px-3 py-3">
                  <input
                    className={cx(cell, "tabular-nums")}
                    inputMode="numeric"
                    value={r.stock}
                    aria-label={`Stock for ${name}`}
                    aria-invalid={Boolean(err("stock")) || undefined}
                    aria-describedby={err("stock") ? eid("stock") : undefined}
                    onChange={(e) => onChange(i, { stock: digits(e.target.value) })}
                  />
                  <CellError id={eid("stock")} message={err("stock")} />
                </td>
                <td className="py-3 pr-5 sm:pr-0">
                  <IconButton label={`Remove variant ${name}`} variant="danger" onClick={() => onRemove(i)}>
                    <TrashIcon />
                  </IconButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
