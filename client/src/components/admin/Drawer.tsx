"use client";
/**
 * Drawer: a panel that slides in from the left or right edge (modal: focus trapped,
 * Esc / backdrop close it, focus returns to the opener).
 *
 *   <Drawer open={open} onClose={close} title="Filters" side="right" footer={<Button>Apply</Button>}>
 *     …
 *   </Drawer>
 *
 * `hideHeader` lets you render your own header (the admin sidebar does); then pass
 * `ariaLabel` so the dialog still has a name.
 */
import { useId, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { IconButton } from "./IconButton";
import { CloseIcon } from "./icons";
import { cx } from "./styles";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  ariaLabel?: string;
  side?: "left" | "right";
  width?: string;
  footer?: ReactNode;
  hideHeader?: boolean;
  /** Panel classes; replaces the default "bg-white" (e.g. "bg-ink" for the sidebar). */
  panelClassName?: string;
  children: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  side = "right",
  width = "w-[min(24rem,88vw)]",
  footer,
  hideHeader,
  panelClassName = "bg-white",
  children,
}: DrawerProps) {
  const id = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={title && !hideHeader ? `${id}-title` : undefined} label={ariaLabel} className={side === "left" ? "justify-start" : "justify-end"}>
      <div
        className={cx(
          "flex h-full flex-col shadow-[0_0_48px_-12px_rgba(27,27,24,0.4)]",
          side === "left" ? "motion-safe:animate-[admin-in-left_220ms_ease-out]" : "motion-safe:animate-[admin-in-right_220ms_ease-out]",
          width,
          panelClassName,
        )}
      >
        {!hideHeader && (
          <header className="flex items-center gap-3 border-b border-ink/10 py-3 pr-3 pl-6">
            <h2 id={`${id}-title`} className="flex-1 font-display text-2xl font-semibold">
              {title}
            </h2>
            <IconButton label="Close panel" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </header>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-ink/10 px-6 py-4">{footer}</footer>}
      </div>
      <style>{`@keyframes admin-in-left{from{transform:translateX(-100%)}to{transform:none}}@keyframes admin-in-right{from{transform:translateX(100%)}to{transform:none}}`}</style>
    </Dialog>
  );
}
