/** Vertical status timeline from `statusHistory` (oldest first). */
import { ORDER_STATUS_COLOR, ORDER_STATUS_TEXT } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminOrder } from "@/lib/admin/types";

export function OrderTimeline({ history }: { history: AdminOrder["statusHistory"] }) {
  return (
    <ol className="relative ml-2 border-l border-ink/15">
      {history.map((h, i) => (
        <li key={h.id} className="relative pb-5 pl-6 last:pb-0">
          <span
            aria-hidden
            className="absolute top-1 -left-[7px] size-3.5 rounded-full border-2 border-white ring-1 ring-ink/15"
            style={{ backgroundColor: ORDER_STATUS_COLOR[h.status] }}
          />
          <p className="text-sm font-semibold text-ink">
            {ORDER_STATUS_TEXT[h.status]}
            {i === history.length - 1 && <span className="sr-only"> (current)</span>}
          </p>
          <p className="text-xs text-ink/55">
            <time dateTime={h.createdAt}>{formatDateTime(h.createdAt)}</time>
          </p>
          {h.note && <p className="mt-1 text-sm break-words text-ink/75">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
