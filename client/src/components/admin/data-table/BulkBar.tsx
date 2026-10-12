/** BulkBar: "N selected", the bulk action buttons and "Clear selection", above the table. */
import type { ReactNode } from "react";
import { Button } from "../Button";

export function BulkBar({ count, actions, onClear }: { count: number; actions?: ReactNode; onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-sage-50 px-4 py-2" aria-live="polite">
      <p className="text-sm font-semibold text-ink">{count} selected</p>
      <div className="flex flex-wrap gap-2">{actions}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}
