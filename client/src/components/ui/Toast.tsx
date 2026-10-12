"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, message, description, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, message, description, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, description?: string) => {
      addToast({ type: "success", message, description });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, description?: string) => {
      addToast({ type: "error", message, description });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, description?: string) => {
      addToast({ type: "info", message, description });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info }}
    >
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg p-3.5 shadow-xl border backdrop-blur-md ${
                t.type === "success"
                  ? "bg-ivory border-sage-400 text-ink"
                  : t.type === "error"
                  ? "bg-sale/95 border-sale text-white"
                  : "bg-ivory border-gold-400 text-ink"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-sage-600" />
                )}
                {t.type === "error" && (
                  <AlertCircle className="h-4 w-4 text-white" />
                )}
                {t.type === "info" && (
                  <Info className="h-4 w-4 text-gold-600" />
                )}
              </div>
              <div className="flex-1 text-xs">
                <p className="font-semibold leading-tight">{t.message}</p>
                {t.description && (
                  <p className="mt-1 opacity-80 leading-normal">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-full p-1 opacity-60 hover:opacity-100 transition cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
