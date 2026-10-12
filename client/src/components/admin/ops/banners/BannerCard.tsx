"use client";
/**
 * One banner in the grid: preview, text, active switch, edit and delete. When
 * `reorderable`, it shows move up/down buttons and a drag handle (the parent
 * handles drop). `position` is the 1-based display position badge, when known.
 */
import { Button } from "@/components/admin/Button";
import { IconButton } from "@/components/admin/IconButton";
import { ArrowDownIcon, ArrowUpIcon, GripIcon, TrashIcon } from "@/components/admin/icons";
import { Switch } from "@/components/admin/Switch";
import { card, cx } from "@/components/admin/styles";
import type { Banner } from "@/lib/admin/types";
import { Thumb } from "../../shared/Thumb";

interface Props {
  banner: Banner;
  index: number;
  count: number;
  position?: number;
  reorderable: boolean;
  dragging: boolean;
  onMove: (to: number) => void;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  dragProps: React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };
}

export function BannerCard({ banner: b, index, count, position, reorderable, dragging, onMove, onToggle, onEdit, onDelete, dragProps }: Props) {
  return (
    <li {...dragProps} className={cx(card, "flex min-w-0 flex-col overflow-hidden transition-opacity", dragging && "opacity-40", !b.isActive && "bg-ivory")}>
      <div className="relative">
        <Thumb src={b.imageUrl} alt={b.title} className={cx("aspect-[16/7] w-full rounded-none", !b.isActive && "opacity-60")} />
        {position !== undefined && (
          <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-ivory tabular-nums">#{position}</span>
        )}
        {reorderable && <GripIcon aria-hidden className="absolute top-2 right-2 size-7 cursor-grab rounded-md bg-white/85 p-1 text-ink/70" />}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-display text-xl leading-tight font-semibold text-ink">{b.title}</p>
        {b.subtitle && <p className="text-sm text-ink/65">{b.subtitle}</p>}
        {b.ctaLabel && (
          <p className="mt-1 text-xs text-ink/55">
            Button: <span className="font-semibold text-ink/75">{b.ctaLabel}</span>
            {b.ctaHref && <span className="break-all"> → {b.ctaHref}</span>}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-ink/10 px-2 py-1">
        <Switch size="sm" aria-label={`Active: ${b.title}`} checked={b.isActive} onChange={onToggle} />
        <span className="mr-auto text-xs text-ink/60">{b.isActive ? "Active" : "Hidden"}</span>
        {reorderable && (
          <>
            <IconButton label={`Move ${b.title} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUpIcon /></IconButton>
            <IconButton label={`Move ${b.title} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDownIcon /></IconButton>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
        <IconButton label={`Delete ${b.title}`} variant="danger" onClick={onDelete}><TrashIcon /></IconButton>
      </div>
    </li>
  );
}
