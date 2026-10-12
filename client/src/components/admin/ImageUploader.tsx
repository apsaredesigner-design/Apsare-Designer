"use client";
/**
 * ImageUploader: drag-and-drop / file-picker image upload with previews, progress,
 * reordering (drag or ← → buttons), alt text and remove. Controlled.
 *
 *   const [images, setImages] = useState<UploaderImage[]>(product.images);
 *   <ImageUploader label="Product images" value={images} onChange={setImages} max={10} />
 *   // on save: images.map((img, i) => ({ url: img.url, publicId: img.publicId, alt: img.alt, sortOrder: i }))
 *
 * - Client-side checks before upload: JPEG/PNG/WebP/AVIF, ≤ 5 MB each, at most `max`
 *   images in total (server allows 10 per request and 15 per product).
 * - Each file uploads separately via `upload()` so one bad file doesn't fail the rest;
 *   a progress bar tracks the batch and each tile shows its own state.
 * - The first image is the cover.
 * - Removing an image uploaded in this session also deletes it from storage.
 *   Removing a pre-existing image only drops it from `value`; `onRemoveExisting`
 *   lets the form delete it from storage after a successful save.
 *
 * Parts live in ./image-uploader/: useImageUploads (upload state), Dropzone, and
 * ImageTile / PendingTile.
 */
import { useEffect, useId, useRef, useState } from "react";
import { UPLOAD_LIMITS, deleteUpload } from "@/lib/admin/upload";
import { Dropzone } from "./image-uploader/Dropzone";
import { ImageTile, PendingTile } from "./image-uploader/ImageTile";
import type { UploaderImage } from "./image-uploader/types";
import { useImageUploads } from "./image-uploader/useImageUploads";
import { WarningIcon } from "./icons";

export type { UploaderImage };

export interface ImageUploaderProps {
  label: string;
  value: UploaderImage[];
  onChange: (images: UploaderImage[]) => void;
  max?: number;
  /** Show an alt-text input under each image (default true). */
  withAlt?: boolean;
  onRemoveExisting?: (image: UploaderImage) => void;
  disabled?: boolean;
  hint?: string;
}

export function ImageUploader({ label, value, onChange, max = UPLOAD_LIMITS.maxFiles, withAlt = true, onRemoveExisting, disabled, hint }: ImageUploaderProps) {
  const id = useId();
  const valueRef = useRef(value);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const commit = (next: UploaderImage[]) => {
    valueRef.current = next;
    onChange(next);
  };

  const uploads = useImageUploads({ max, count: value.length, append: (img) => commit([...valueRef.current, img]) });
  const { pending, problems, batch, uploading } = uploads;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
    setAnnounce(`Moved image to position ${to + 1} of ${next.length}.`);
  };

  const remove = (index: number) => {
    const img = value[index];
    commit(value.filter((_, i) => i !== index));
    setAnnounce(`Removed image ${index + 1}.`);
    if (uploads.wasUploadedHere(img.url)) deleteUpload(img).catch(() => {});
    else onRemoveExisting?.(img);
  };

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink/80">{label}</legend>

      <Dropzone
        hintId={`${id}-hint`}
        hint={hint}
        full={uploads.room <= 0}
        max={max}
        used={value.length}
        ignoreDrag={dragIndex !== null}
        onFiles={uploads.addFiles}
      />

      {batch.total > 0 && batch.done < batch.total && (
        <div className="mt-3 flex items-center gap-3 text-xs text-ink/65">
          <progress
            value={batch.done}
            max={batch.total}
            aria-label="Upload progress"
            className="h-1.5 flex-1 appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-sage-600 [&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-sage-600"
          />
          <span className="tabular-nums">
            Uploading {Math.min(batch.done + 1, batch.total)} of {batch.total}
          </span>
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-md bg-sale/5 px-3 py-2 text-xs text-sale">
          {problems.map((p) => (
            <li key={p} className="flex gap-2">
              <WarningIcon className="mt-px size-3.5 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      )}

      {(value.length > 0 || pending.length > 0) && (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((img, i) => (
            <ImageTile
              key={img.url}
              image={img}
              index={i}
              count={value.length}
              altId={withAlt ? `${id}-alt-${i}` : undefined}
              dragging={dragIndex === i}
              disabled={disabled}
              onMove={(to) => move(i, to)}
              onRemove={() => remove(i)}
              onAlt={(alt) => commit(value.map((v, j) => (j === i ? { ...v, alt } : v)))}
              dragProps={{
                onDragStart: (e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                },
                onDragOver: (e) => {
                  if (dragIndex !== null) e.preventDefault();
                },
                onDrop: (e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  move(dragIndex, i);
                  setDragIndex(null);
                },
                onDragEnd: () => setDragIndex(null),
              }}
            />
          ))}
          {pending.map((p) => (
            <PendingTile key={p.key} item={p} onDismiss={() => uploads.dismiss(p.key)} />
          ))}
        </ol>
      )}

      <p aria-live="polite" className="sr-only">
        {announce}
        {uploading > 0 ? ` Uploading ${uploading} image${uploading > 1 ? "s" : ""}.` : ""}
      </p>
      <style>{`@keyframes admin-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </fieldset>
  );
}
