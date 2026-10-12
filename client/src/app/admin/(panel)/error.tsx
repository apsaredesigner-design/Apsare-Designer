"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";

/** Error boundary for admin panel pages (renders inside the shell). */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-ink/10 bg-white">
      <EmptyState
        tone="error"
        title="Something went wrong"
        description="This page hit an unexpected error. You can try again, or head back to the dashboard."
        action={
          <>
            <Button onClick={() => retry()}>Try again</Button>
            <ButtonLink href="/admin/dashboard" variant="secondary">
              Go to dashboard
            </ButtonLink>
          </>
        }
      />
      {error.digest && <p className="pb-6 text-center text-xs text-ink/40">Reference: {error.digest}</p>}
    </div>
  );
}
