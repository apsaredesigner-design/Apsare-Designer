"use client";
/**
 * StatusUpdateForm: move an order to one of its `nextStatuses`, with an optional note.
 * CANCELLED asks for confirmation first (it restocks and releases the coupon).
 * A 409 (someone changed it meanwhile, or an invalid move) reloads the order.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FormField } from "@/components/admin/FormField";
import { Select } from "@/components/admin/Select";
import { ORDER_STATUS_TEXT } from "@/components/admin/StatusBadge";
import { Textarea } from "@/components/admin/Textarea";
import { errorMessage } from "@/lib/admin/errors";
import { adminApi } from "@/lib/admin/api";
import type { AdminOrder, OrderStatus } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

interface Props {
  order: AdminOrder;
  onUpdated: (order: AdminOrder) => void;
  onConflict: () => void;
}

export function StatusUpdateForm({ order, onUpdated, onConflict }: Props) {
  const [picked, setPicked] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const status = picked && order.nextStatuses.includes(picked) ? picked : (order.nextStatuses[0] ?? "");

  const save = useMutation(
    (s: OrderStatus) => adminApi.orders.setStatus(order.orderNumber, { status: s, ...(note.trim() ? { note: note.trim() } : {}) }),
    {
      success: (o) => `Order marked ${ORDER_STATUS_TEXT[o.status].toLowerCase()}`,
      error: (e) => (e.status === 409 ? "The order changed meanwhile, so it has been reloaded." : errorMessage(e)),
      onSuccess: (o) => {
        setNote("");
        setPicked("");
        setConfirming(false);
        onUpdated(o);
      },
      onError: (e) => {
        setConfirming(false);
        if (e.status === 409) onConflict();
      },
    },
  );

  if (order.nextStatuses.length === 0) {
    return <p className="text-sm text-ink/60">This order is {ORDER_STATUS_TEXT[order.status].toLowerCase()}. No further status changes are possible.</p>;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    if (status === "CANCELLED") setConfirming(true);
    else void save.mutate(status);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="New status" required>
        <Select
          value={status}
          onChange={(e) => setPicked(e.target.value as OrderStatus)}
          options={order.nextStatuses.map((s) => ({ value: s, label: ORDER_STATUS_TEXT[s] }))}
        />
      </FormField>
      <FormField label="Note" hint="Optional. Included in the customer's status email." name="note" errors={save.fieldErrors}>
        <Textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. AWB 1234567890 via Delhivery" />
      </FormField>
      <Button type="submit" variant={status === "CANCELLED" ? "danger" : "primary"} loading={save.pending && !confirming}>
        {status === "CANCELLED" ? "Cancel order…" : `Mark as ${ORDER_STATUS_TEXT[status].toLowerCase()}`}
      </Button>
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={`Cancel order ${order.orderNumber}?`}
        description="Every item goes back into stock, sold counts and the coupon use are reversed, and the payment is marked refunded (if paid) or failed. The customer is emailed. This can't be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        loading={save.pending}
        onConfirm={() => void save.mutate("CANCELLED")}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
