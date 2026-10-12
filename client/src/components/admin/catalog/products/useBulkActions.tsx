"use client";
/**
 * Bulk activate / deactivate / delete for the selected products, each behind a
 * ConfirmDialog. Activation skips products that aren't sellable yet and a dialog
 * lists them; delete reports hard- vs soft-deleted (products with orders are
 * only deactivated).
 *
 *   const bulk = useBulkActions(list.items, onDone);
 *   <DataTable bulkActions={bulk.buttons(sel.selected)} … />
 *   {bulk.dialogs}   // render OUTSIDE the table: the bulk bar unmounts when the selection clears
 */
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";
import { useToast } from "@/components/admin/Toast";
import { cx, focusRing } from "@/components/admin/styles";
import { adminApi } from "@/lib/admin/api";
import { SKIP_REASON_TEXT } from "@/lib/admin/helpers/products";
import type { AdminProductListItem, BulkProductAction, BulkProductResult } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

const COPY: Record<BulkProductAction, { title: (n: number) => string; body: string; confirm: string }> = {
  activate: {
    title: (n) => `Activate ${n} product${n === 1 ? "" : "s"}?`,
    body: "They become visible in the store. Products without an image or a variant are skipped.",
    confirm: "Activate",
  },
  deactivate: {
    title: (n) => `Deactivate ${n} product${n === 1 ? "" : "s"}?`,
    body: "They are hidden from the store. Nothing is deleted.",
    confirm: "Deactivate",
  },
  delete: {
    title: (n) => `Delete ${n} product${n === 1 ? "" : "s"}?`,
    body: "Products with orders are deactivated instead so order history stays intact. All others are deleted permanently with their images, variants and reviews.",
    confirm: "Delete",
  },
};

const plural = (n: number) => `${n} product${n === 1 ? "" : "s"}`;

function summary(r: BulkProductResult): string {
  if (r.action === "delete") {
    const hard = r.hardDeleted?.length ?? 0;
    const soft = r.softDeleted?.length ?? 0;
    return [hard && `${plural(hard)} deleted permanently`, soft && `${plural(soft)} deactivated (they have orders)`].filter(Boolean).join(", ") || "Nothing was deleted";
  }
  return `${plural(r.affected)} ${r.action === "activate" ? "activated" : "deactivated"}`;
}

export function useBulkActions(items: AdminProductListItem[], onDone: () => void) {
  const toast = useToast();
  const [pending, setPending] = useState<{ action: BulkProductAction; ids: number[] } | null>(null);
  const [skipped, setSkipped] = useState<{ id: number; name: string; reason: string }[]>([]);

  const run = useMutation((ids: number[], a: BulkProductAction) => adminApi.products.bulk(ids, a), {
    onSuccess: (r) => {
      const skips = r.skipped ?? [];
      if (skips.length) {
        const names = new Map(items.map((p) => [p.id, p.name]));
        setSkipped(skips.map((s) => ({ id: s.id, name: names.get(s.id) ?? `#${s.id}`, reason: SKIP_REASON_TEXT[s.reason] })));
      }
      toast.success(summary(r), skips.length ? { description: `${plural(skips.length)} skipped: not ready to sell.` } : undefined);
      onDone();
    },
  });

  const confirm = async () => {
    if (!pending) return;
    await run.mutate(pending.ids, pending.action);
    setPending(null);
  };
  const action = pending?.action;
  const n = pending?.ids.length ?? 0;

  const buttons = (ids: number[]) => (
    <>
      <Button size="sm" variant="secondary" onClick={() => setPending({ action: "activate", ids })}>Activate</Button>
      <Button size="sm" variant="secondary" onClick={() => setPending({ action: "deactivate", ids })}>Deactivate</Button>
      <Button size="sm" variant="danger" onClick={() => setPending({ action: "delete", ids })}>Delete</Button>
    </>
  );

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending !== null}
        title={action ? COPY[action].title(n) : ""}
        description={action ? COPY[action].body : undefined}
        confirmLabel={action ? COPY[action].confirm : "Confirm"}
        tone={action === "delete" ? "danger" : "default"}
        loading={run.pending}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />

      <Modal
        open={skipped.length > 0}
        onClose={() => setSkipped([])}
        size="sm"
        title="Some products weren't activated"
        description="An active product needs at least one image and one variant."
        footer={<Button onClick={() => setSkipped([])}>OK</Button>}
      >
        <ul className="divide-y divide-ink/10 text-sm">
          {skipped.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <Link href={`/admin/products/${s.id}/edit`} className={cx("rounded font-semibold underline-offset-4 hover:underline", focusRing)}>
                {s.name}
              </Link>
              <span className="shrink-0 text-xs text-sale">{s.reason}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );

  return { buttons, dialogs };
}
