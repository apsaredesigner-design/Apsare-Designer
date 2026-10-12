"use client";
/**
 * ImageTile: one uploaded image in the grid: preview (the first is the cover), drag
 * handle, move earlier/later, remove, and an optional alt-text input.
 * PendingTile: a file that is uploading or failed, with a dismiss button on failure.
 */
import { IconButton } from "../IconButton";
import { ChevronLeftIcon, ChevronRightIcon, GripIcon, Spinner, TrashIcon, WarningIcon } from "../icons";
import { cx } from "../styles";
import type { PendingUpload, UploaderImage } from "./types";

interface TileProps {
  image: UploaderImage;
  index: number;
  count: number;
  altId?: string;
  dragging: boolean;
  disabled?: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
  onAlt: (alt: string) => void;
  dragProps: Pick<React.HTMLAttributes<HTMLLIElement>, "onDragStart" | "onDragOver" | "onDrop" | "onDragEnd">;
}

export function ImageTile({ image: img, index: i, count, altId, dragging, disabled, onMove, onRemove, onAlt, dragProps }: TileProps) {
  return (
    <li
      draggable={!disabled}
      {...dragProps}
      className={cx(
        "group overflow-hidden rounded-lg border bg-white transition-[border-color,opacity]",
        dragging ? "border-sage-600 opacity-50" : "border-ink/10",
      )}
    >
      <div className="relative aspect-[3/4] bg-ivory">
        {/* eslint-disable-next-line @next/next/no-img-element -- previews of arbitrary upload URLs */}
        <img src={img.url} alt={img.alt || `Image ${i + 1}`} className="size-full object-cover" />
        {i === 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-gold-300 uppercase">
            Cover
          </span>
        )}
        <span aria-hidden className="absolute top-2 right-2 grid size-7 cursor-grab place-items-center rounded bg-white/85 text-ink/60">
          <GripIcon className="size-4" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 px-1 py-1">
        <IconButton label={`Move image ${i + 1} earlier`} onClick={() => onMove(i - 1)} disabled={i === 0}>
          <ChevronLeftIcon />
        </IconButton>
        <span className="text-xs text-ink/50 tabular-nums">{i + 1}</span>
        <IconButton label={`Move image ${i + 1} later`} onClick={() => onMove(i + 1)} disabled={i === count - 1}>
          <ChevronRightIcon />
        </IconButton>
        <IconButton label={`Remove image ${i + 1}`} variant="danger" onClick={onRemove}>
          <TrashIcon />
        </IconButton>
      </div>
      {altId && (
        <div className="border-t border-ink/10 px-2 py-2">
          <label htmlFor={altId} className="sr-only">
            Alt text for image {i + 1}
          </label>
          <input
            id={altId}
            value={img.alt ?? ""}
            placeholder="Alt text"
            maxLength={200}
            onChange={(e) => onAlt(e.target.value)}
            className="min-h-9 w-full rounded border border-transparent bg-transparent px-1.5 text-xs placeholder:text-ink/40 hover:border-ink/15 focus:border-sage-600 focus:outline-none"
          />
        </div>
      )}
    </li>
  );
}

export function PendingTile({ item: p, onDismiss }: { item: PendingUpload; onDismiss: () => void }) {
  return (
    <li className="overflow-hidden rounded-lg border border-ink/10 bg-white" aria-busy={p.status === "uploading"}>
      <div className="relative aspect-[3/4] bg-ivory">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={p.preview} alt="" className={cx("size-full object-cover", p.status === "uploading" ? "opacity-50" : "opacity-30 grayscale")} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          {p.status === "uploading" ? (
            <>
              <Spinner className="size-6 text-sage-700" />
              <span className="text-xs font-semibold text-ink">Uploading…</span>
            </>
          ) : (
            <>
              <WarningIcon className="size-6 text-sale" />
              <span className="text-xs font-semibold text-sale">{p.error}</span>
            </>
          )}
        </div>
        {p.status === "uploading" && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-ink/10">
            <span className="block h-full w-1/3 bg-sage-600 motion-safe:animate-[admin-indeterminate_1.1s_ease-in-out_infinite]" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 py-1 pl-2">
        <span className="min-w-0 flex-1 truncate text-xs text-ink/60">{p.name}</span>
        {p.status === "error" && (
          <IconButton label={`Dismiss ${p.name}`} onClick={onDismiss}>
            <TrashIcon />
          </IconButton>
        )}
      </div>
    </li>
  );
}
