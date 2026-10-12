"use client";
/**
 * Dropzone: the dashed drop target with a "Choose images" button and a hidden file
 * input. Ignores drags that start inside the tile grid (`ignoreDrag`).
 *
 *   <Dropzone hintId={`${id}-hint`} full={room <= 0} max={max} used={value.length} onFiles={addFiles} />
 */
import { useRef, useState } from "react";
import { UPLOAD_LIMITS } from "@/lib/admin/upload";
import { Button } from "../Button";
import { UploadIcon } from "../icons";
import { cx } from "../styles";

interface Props {
  hintId: string;
  hint?: string;
  full: boolean;
  max: number;
  used: number;
  /** True while an image tile is being dragged (a reorder, not a file drop). */
  ignoreDrag: boolean;
  onFiles: (files: FileList) => void;
}

export function Dropzone({ hintId, hint, full, max, used, ignoreDrag, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (ignoreDrag || full) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (ignoreDrag) return;
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cx(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
        dragOver ? "border-sage-600 bg-sage-50" : "border-ink/20 bg-ivory/60",
        full && "opacity-60",
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-white text-sage-700 ring-1 ring-ink/10">
        <UploadIcon />
      </span>
      <div>
        <p className="text-sm text-ink">{full ? `Maximum of ${max} image${max === 1 ? "" : "s"} reached` : "Drag images here, or"}</p>
        <p id={hintId} className="mt-1 text-xs text-ink/55">
          {hint ?? `JPEG, PNG, WebP or AVIF · up to 5 MB each · ${used}/${max} used`}
        </p>
      </div>
      {!full && (
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} aria-describedby={hintId}>
          Choose images
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_LIMITS.accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
