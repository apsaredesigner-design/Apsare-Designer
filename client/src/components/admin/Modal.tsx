"use client";
/**
 * Modal: a centred dialog with a title, optional description, body and footer.
 * Focus is trapped while open, Esc / backdrop / the close button call `onClose`,
 * and focus returns to the opener.
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Add pincode"
 *          footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={save}>Save</Button></>}>
 *     …form fields…
 *   </Modal>
 *
 * size: "sm" | "md" (default) | "lg". Set `dismissible={false}` while a save is in flight.
 */
import { useId, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { IconButton } from "./IconButton";
import { CloseIcon } from "./icons";
import { cx } from "./styles";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
  initialFocus?: string;
  children?: ReactNode;
}

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl" };

export function Modal({ open, onClose, title, description, footer, size = "md", dismissible = true, initialFocus, children }: ModalProps) {
  const id = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={`${id}-title`}
      describedBy={description ? `${id}-desc` : undefined}
      dismissible={dismissible}
      initialFocus={initialFocus}
      className="items-end justify-center p-0 sm:items-center sm:p-6"
    >
      <div
        className={cx(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink/10 bg-white shadow-[0_24px_64px_-16px_rgba(27,27,24,0.35)] sm:rounded-2xl",
          "motion-safe:animate-[admin-pop_180ms_ease-out]",
          SIZES[size],
        )}
      >
        <header className="flex items-start gap-4 border-b border-ink/10 px-6 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="font-display text-2xl font-semibold leading-tight">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-1 text-sm text-ink/60">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <IconButton label="Close dialog" onClick={onClose} className="-mt-1 -mr-3">
              <CloseIcon />
            </IconButton>
          )}
        </header>
        {children && <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>}
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-ink/10 bg-ivory/60 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
      <style>{`@keyframes admin-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </Dialog>
  );
}
