"use client";
/**
 * Activate/deactivate and role change for a customer, each behind a ConfirmDialog.
 * Server guards (SELF_DEACTIVATION, SELF_ROLE_CHANGE, LAST_ADMIN) are shown in the dialog.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminSession } from "@/components/admin/AdminSession";
import { errorMessage } from "@/lib/admin/errors";
import { adminApi } from "@/lib/admin/api";
import type { AdminCustomerDetail } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";

type Action = "status" | "role" | null;

export function AccountActions({ customer: c, onChanged }: { customer: AdminCustomerDetail; onChanged: (patch: Partial<AdminCustomerDetail>) => void }) {
  const { user } = useAdminSession();
  const [open, setOpen] = useState<Action>(null);
  const isSelf = user.id === c.id;
  const nextRole = c.role === "ADMIN" ? "CUSTOMER" : "ADMIN";

  const status = useMutation(() => adminApi.customers.setStatus(c.id, !c.isActive), {
    success: (r) => (r.isActive ? "Account activated" : "Account deactivated"),
    error: false,
    onSuccess: (r) => { setOpen(null); onChanged({ isActive: r.isActive }); },
  });
  const role = useMutation(() => adminApi.customers.setRole(c.id, nextRole), {
    success: (r) => (r.role === "ADMIN" ? `${c.fullName} is now an admin` : `${c.fullName} is now a customer`),
    error: false,
    onSuccess: (r) => { setOpen(null); onChanged({ role: r.role, isActive: r.isActive }); },
  });
  const active = open === "status" ? status : role;
  const close = () => { setOpen(null); status.reset(); role.reset(); };

  return (
    <>
      <Button variant={c.isActive ? "danger" : "primary"} size="sm" onClick={() => setOpen("status")}>
        {c.isActive ? "Deactivate" : "Activate"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setOpen("role")}>
        {c.role === "ADMIN" ? "Make customer" : "Make admin"}
      </Button>
      {isSelf && <p className="w-full text-xs text-ink/55">This is your own account; the server won’t let you disable it or change its role.</p>}
      <ConfirmDialog
        open={open !== null}
        tone={open === "status" && c.isActive ? "danger" : "default"}
        title={
          open === "status"
            ? `${c.isActive ? "Deactivate" : "Activate"} ${c.fullName}?`
            : `${nextRole === "ADMIN" ? "Give" : "Remove"} admin access ${nextRole === "ADMIN" ? "to" : "from"} ${c.fullName}?`
        }
        description={
          open === "status"
            ? c.isActive
              ? "They are signed out on their next request and can't sign in or place orders until reactivated. Their orders are kept."
              : "They can sign in and place orders again."
            : nextRole === "ADMIN"
              ? "Admins can see every order and customer and change the whole store."
              : "They lose access to the admin panel on their next request."
        }
        confirmLabel={open === "status" ? (c.isActive ? "Deactivate" : "Activate") : nextRole === "ADMIN" ? "Make admin" : "Make customer"}
        loading={active.pending}
        onConfirm={() => void active.mutate()}
        onCancel={close}
      >
        {active.error && (
          <p role="alert" className="mt-3 rounded-md bg-sale/10 px-3 py-2 text-sm text-sale">
            {errorMessage(active.error)}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
