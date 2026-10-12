"use client";
/**
 * useActiveToggle: flips a product's isActive in the loaded list immediately
 * (optimistic), calls PATCH /admin/products/:id/status through useMutation, and rolls
 * back with an error toast (e.g. PRODUCT_INCOMPLETE) if the server refuses.
 *
 *   const active = useActiveToggle(list.setItems);
 *   <Switch disabled={active.busyIds.includes(p.id)} onChange={(v) => active.toggle(p, v)} />
 */
import { useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { adminApi } from "@/lib/admin/api";
import { errorMessage } from "@/lib/admin/errors";
import type { AdminProductListItem } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

export function useActiveToggle(setItems: (fn: (items: AdminProductListItem[]) => AdminProductListItem[]) => void) {
  const toast = useToast();
  const [busyIds, setBusy] = useState<number[]>([]);

  const patch = (id: number, isActive: boolean) => setItems((items) => items.map((p) => (p.id === id ? { ...p, isActive } : p)));

  const mutation = useMutation((p: AdminProductListItem, next: boolean) => adminApi.products.setStatus(p.id, next), {
    onMutate: (p, next) => {
      patch(p.id, next);
      setBusy((ids) => [...ids, p.id]);
    },
    success: (_r, p, next) => `“${p.name}” ${next ? "activated" : "deactivated"}`,
    // The toast carries a hint for PRODUCT_INCOMPLETE, so it is built here, not by useMutation.
    error: false,
    onError: (err, p, next) => {
      patch(p.id, !next);
      toast.error(next ? "Couldn't activate this product" : "Couldn't deactivate this product", {
        description: err.code === "PRODUCT_INCOMPLETE" ? "Add at least one image and one variant first." : errorMessage(err),
      });
    },
    onSettled: (p) => setBusy((ids) => ids.filter((id) => id !== p.id)),
  });

  return { toggle: (p: AdminProductListItem, next: boolean) => void mutation.mutate(p, next), busyIds };
}
