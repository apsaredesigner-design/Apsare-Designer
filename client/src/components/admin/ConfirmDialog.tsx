"use client";
/**
 * ConfirmDialog: an alertdialog asking the admin to confirm an action.
 * Focus starts on Cancel (the safe choice); Esc cancels.
 *
 *   <ConfirmDialog
 *     open={!!target} onCancel={() => setTarget(null)}
 *     title="Delete product?" description="Products with orders are deactivated instead."
 *     confirmLabel="Delete" tone="danger" loading={del.pending}
 *     onConfirm={async () => { await del.mutate(target.id); setTarget(null); }}
 *   />
 */
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      initialFocus="[data-confirm-cancel]"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading} data-confirm-cancel>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
