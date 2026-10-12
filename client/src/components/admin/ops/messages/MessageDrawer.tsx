"use client";
/** Drawer showing one contact message, with reply, mark unread and delete actions. */
import { Button, ButtonLink } from "@/components/admin/Button";
import { Drawer } from "@/components/admin/Drawer";
import { MailIcon, TrashIcon } from "@/components/admin/icons";
import { formatDateTime } from "@/lib/admin/format";
import type { ContactMessage } from "@/lib/admin/types";

interface Props {
  message: ContactMessage | null;
  onClose: () => void;
  onMarkUnread: (m: ContactMessage) => void;
  onDelete: (m: ContactMessage) => void;
  busy: boolean;
}

export function MessageDrawer({ message: m, onClose, onMarkUnread, onDelete, busy }: Props) {
  return (
    <Drawer
      open={m !== null}
      onClose={onClose}
      title={m?.subject ?? "Message"}
      width="w-[min(34rem,100vw)]"
      footer={
        m && (
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} icon={<MailIcon />}>Reply</ButtonLink>
            <Button variant="secondary" onClick={() => onMarkUnread(m)} disabled={busy}>Mark unread</Button>
            <Button variant="danger" icon={<TrashIcon />} onClick={() => onDelete(m)} disabled={busy} className="ml-auto">Delete</Button>
          </div>
        )
      }
    >
      {m && (
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink/55">From</dt>
            <dd className="font-semibold text-ink">{m.name}</dd>
            <dt className="text-ink/55">Email</dt>
            <dd className="break-all"><a href={`mailto:${m.email}`} className="underline-offset-4 hover:underline">{m.email}</a></dd>
            {m.phone && (<><dt className="text-ink/55">Phone</dt><dd><a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline">{m.phone}</a></dd></>)}
            <dt className="text-ink/55">Received</dt>
            <dd><time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time></dd>
          </dl>
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-ink/85">{m.message}</p>
        </div>
      )}
    </Drawer>
  );
}
