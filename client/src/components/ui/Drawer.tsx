"use client";

import React, { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import {
  drawerRightVariants,
  drawerBottomVariants,
  modalBackdropVariants,
} from "@/lib/motion";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  position?: "right" | "bottom";
  width?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  position = "right",
  width = "md",
  showCloseButton = true,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[width];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-ink/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          <div
            className={`fixed inset-0 pointer-events-none flex ${
              position === "right" ? "justify-end" : "items-end"
            }`}
          >
            <motion.div
              variants={
                position === "right" ? drawerRightVariants : drawerBottomVariants
              }
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              className={`pointer-events-auto flex flex-col bg-ivory shadow-2xl border-l border-sage-200 ${
                position === "right"
                  ? `h-full w-full ${widthClasses}`
                  : "w-full max-h-[90vh] rounded-t-2xl border-t"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-sage-200 px-6 py-4">
                <div>
                  {title && (
                    <h3 className="font-display text-xl font-semibold text-ink">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-ink/60">{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close panel"
                    className="rounded-full p-2 text-ink/50 hover:bg-sage-100 hover:text-ink transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
