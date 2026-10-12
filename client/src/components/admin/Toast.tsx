"use client";
/**
 * ToastProvider + useToast: transient feedback in the bottom-right corner.
 *
 *   const toast = useToast();
 *   toast.success("Product saved");
 *   toast.error("Couldn't delete", { description: err.message });
 *   toast.info("Copied");
 *
 * Success/info toasts are announced politely (role="status"); errors use role="alert".
 * Toasts auto-dismiss after 5s (errors 8s), pause while hovered or focused, and can be
 * dismissed with the close button. ToastProvider is mounted by the admin panel layout
 * and the login page.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, CloseIcon, InfoIcon, WarningIcon } from "./icons";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}
interface ToastOptions {
  description?: string;
}
export interface ToastApi {
  success: (title: string, opts?: ToastOptions) => void;
  error: (title: string, opts?: ToastOptions) => void;
  info: (title: string, opts?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((tone: Tone, title: string, opts?: ToastOptions) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-4), { id, tone, title, description: opts?.description }]);
  }, []);

  const value = useMemo<ToastApi>(
    () => ({
      success: (t, o) => push("success", t, o),
      error: (t, o) => push("error", t, o),
      info: (t, o) => push("info", t, o),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONE = {
  success: { icon: CheckIcon, accent: "text-sage-600", bar: "bg-sage-500" },
  error: { icon: WarningIcon, accent: "text-sale", bar: "bg-sale" },
  info: { icon: InfoIcon, accent: "text-gold-700", bar: "bg-gold-500" },
} as const;

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const { icon: Icon, accent, bar } = TONE[toast.tone];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onDismiss, toast.tone === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [paused, onDismiss, toast.tone]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-lg border border-ink/10 bg-white shadow-[0_12px_32px_-12px_rgba(27,27,24,0.25)] motion-safe:animate-[admin-toast-in_200ms_ease-out]"
    >
      <span aria-hidden className={`w-1 shrink-0 ${bar}`} />
      <div className="flex flex-1 items-start gap-3 py-3 pl-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${accent}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description && <p className="mt-0.5 text-sm text-ink/65">{toast.description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="grid size-11 shrink-0 place-items-center text-ink/50 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-600"
      >
        <CloseIcon className="size-4" />
      </button>
      <style>{`@keyframes admin-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
