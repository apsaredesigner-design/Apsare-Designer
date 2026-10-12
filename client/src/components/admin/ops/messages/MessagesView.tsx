"use client";
/**
 * Admin inbox for contact-form messages: unread in bold, read/unread filter,
 * open in a Drawer (which marks it read), mark unread, delete.
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { MailIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { Skeleton } from "@/components/admin/Skeleton";
import { card, cx, focusRing } from "@/components/admin/styles";
import { errorMessage } from "@/lib/admin/errors";
import { formatDateTime } from "@/lib/admin/format";
import { adminApi } from "@/lib/admin/api";
import type { ContactMessage } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useMutation } from "@/lib/admin/use-mutation";
import { MessageDrawer } from "./MessageDrawer";

export function MessagesView() {
  const list = useAdminList<ContactMessage>("/admin/contact-messages", { filters: ["isRead"] });
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);
  const open = list.items.find((m) => m.id === openId) ?? null;
  const patch = (m: ContactMessage) => list.setItems((items) => items.map((x) => (x.id === m.id ? m : x)));

  const setRead = useMutation((m: ContactMessage, isRead: boolean) => adminApi.contactMessages.setRead(m.id, isRead), { onSuccess: patch });
  const del = useMutation((m: ContactMessage) => adminApi.contactMessages.remove(m.id), {
    success: "Message deleted",
    onSuccess: () => { setDeleting(null); setOpenId(null); list.reload(); },
  });

  const openMessage = (m: ContactMessage) => {
    setOpenId(m.id);
    if (!m.isRead) void setRead.mutate(m, true);
  };

  return (
    <>
      <PageHeader title="Messages" description="Notes sent through the contact form." />
      <FilterBar active={list.hasActiveFilters} onClear={list.clearFilters}>
        <FilterSelect
          label="Show"
          value={list.filters.isRead}
          onChange={(v) => list.setFilter("isRead", v)}
          options={[{ value: "", label: "All messages" }, { value: "false", label: "Unread" }, { value: "true", label: "Read" }]}
        />
      </FilterBar>
      <div className={cx(card, "overflow-hidden")} aria-busy={list.loading || undefined}>
        {list.error && list.items.length === 0 ? (
          <EmptyState tone="error" title="Couldn't load messages" description={errorMessage(list.error)} action={<Button onClick={list.reload}>Try again</Button>} />
        ) : list.loading && list.items.length === 0 ? (
          <div role="status" aria-label="Loading messages" className="divide-y divide-ink/10">
            {Array.from({ length: 5 }, (_, i) => (<div key={i} className="p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="mt-2 h-3 w-2/3" /></div>))}
          </div>
        ) : list.isEmpty ? (
          <EmptyState icon={<MailIcon />} title={list.hasActiveFilters ? "Nothing here" : "Inbox is empty"} description={list.filters.isRead === "false" ? "You're all caught up." : undefined} />
        ) : (
          <ul aria-label="Messages" className={cx("divide-y divide-ink/10", list.loading && "opacity-60")}>
            {list.items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openMessage(m)}
                  className={cx("flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory", focusRing, "focus-visible:-outline-offset-2")}
                >
                  <span aria-hidden className={cx("mt-1.5 size-2 shrink-0 rounded-full", m.isRead ? "bg-transparent" : "bg-gold-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={cx("truncate text-sm", m.isRead ? "text-ink/75" : "font-bold text-ink")}>{m.name}</span>
                      <time dateTime={m.createdAt} className="shrink-0 text-xs text-ink/50">{formatDateTime(m.createdAt)}</time>
                    </span>
                    <span className={cx("block truncate text-sm", m.isRead ? "text-ink/70" : "font-semibold text-ink")}>
                      {!m.isRead && <span className="sr-only">Unread: </span>}
                      {m.subject}
                    </span>
                    <span className="block truncate text-xs text-ink/50">{m.message}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {list.meta && list.meta.total > 0 && (
          <div className="border-t border-ink/10 px-4">
            <Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} />
          </div>
        )}
      </div>
      <MessageDrawer
        message={open}
        busy={setRead.pending || del.pending}
        onClose={() => setOpenId(null)}
        onMarkUnread={(m) => { void setRead.mutate(m, false).then((r) => r && setOpenId(null)); }}
        onDelete={setDeleting}
      />
      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title="Delete this message?"
        description={deleting ? `“${deleting.subject}” from ${deleting.name} will be removed permanently.` : undefined}
        confirmLabel="Delete"
        loading={del.pending}
        onConfirm={() => deleting && void del.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
