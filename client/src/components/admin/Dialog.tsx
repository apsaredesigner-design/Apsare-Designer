"use client";
/**
 * Dialog: the low-level modal primitive used by Modal, ConfirmDialog and Drawer.
 * Prefer those; use this only for a new kind of overlay.
 *
 * Built on the native <dialog> + showModal(): the rest of the page becomes inert
 * (focus is trapped inside), Esc closes it, focus returns to the opener on close,
 * and a click on the backdrop closes it (unless `dismissible` is false).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./styles";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog (its title). */
  labelledBy?: string;
  /** Accessible name when there is no visible title. */
  label?: string;
  describedBy?: string;
  /** role="alertdialog" for confirmations. */
  role?: "dialog" | "alertdialog";
  /** false = Esc and backdrop clicks do nothing (e.g. while saving). */
  dismissible?: boolean;
  /** Selector of the element to focus on open (default: first focusable). */
  initialFocus?: string;
  className?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, labelledBy, label, describedBy, role, dismissible = true, initialFocus, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      const target = initialFocus ? dialog.querySelector<HTMLElement>(initialFocus) : null;
      target?.focus();
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
        if (dialog.open) dialog.close();
        opener?.focus?.();
      };
    }
  }, [open, initialFocus]);

  return (
    <dialog
      ref={ref}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={cx(
        // Full-viewport and transparent, so a click outside the panel lands on the <dialog> itself.
        "fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[2px] open:flex",
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}
