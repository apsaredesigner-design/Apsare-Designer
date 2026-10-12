"use client";
/**
 * Warns before the tab is closed or reloaded while `dirty` is true (the browser
 * shows its own generic "Leave site?" prompt).
 */
import { useEffect } from "react";

export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
