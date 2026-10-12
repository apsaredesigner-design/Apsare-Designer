"use client";
/**
 * useImageUploads: the upload state behind ImageUploader. Validates files, uploads each
 * one separately (so one bad file doesn't fail the rest), tracks the batch progress and
 * appends finished images through `append`. Object-URL previews are revoked on unmount.
 *
 *   const uploads = useImageUploads({ max, count: value.length, append: (img) => commit([...valueRef.current, img]) });
 *   uploads.addFiles(fileList); uploads.pending / problems / batch / uploading / room; uploads.dismiss(key)
 *   uploads.wasUploadedHere(url)   // true once: removing such an image deletes it from storage
 */
import { useEffect, useRef, useState } from "react";
import { errorMessage, toApiError } from "@/lib/admin/errors";
import { upload, validateImageFile } from "@/lib/admin/upload";
import type { PendingUpload, UploaderImage } from "./types";

interface Options {
  max: number;
  /** Images already in `value`. */
  count: number;
  append: (image: UploaderImage) => void;
}

export function useImageUploads({ max, count, append }: Options) {
  const uploadedHere = useRef(new Set<string>());
  const previews = useRef(new Set<string>());
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [batch, setBatch] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const uploading = pending.filter((p) => p.status === "uploading").length;
  const room = max - count - uploading;

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const errs: string[] = [];
    const accepted: File[] = [];
    for (const f of files) {
      const problem = validateImageFile(f);
      if (problem) errs.push(problem);
      else if (accepted.length >= room) errs.push(`${f.name}: limit of ${max} images reached.`);
      else accepted.push(f);
    }
    setProblems(errs);
    if (accepted.length === 0) return;

    const items = accepted.map((f, i) => {
      const preview = URL.createObjectURL(f);
      previews.current.add(preview);
      return { file: f, entry: { key: `${Date.now()}-${i}-${f.name}`, name: f.name, preview, status: "uploading" as const } };
    });
    setPending((p) => [...p.filter((x) => x.status === "uploading"), ...items.map((x) => x.entry)]);
    setBatch((b) => (uploading > 0 ? { done: b.done, total: b.total + items.length } : { done: 0, total: items.length }));

    await Promise.all(
      items.map(async ({ file, entry }) => {
        try {
          const [img] = await upload([file]);
          uploadedHere.current.add(img.url);
          append({ url: img.url, publicId: img.publicId, alt: "" });
          setPending((p) => p.filter((x) => x.key !== entry.key));
          URL.revokeObjectURL(entry.preview);
          previews.current.delete(entry.preview);
        } catch (e) {
          const err = toApiError(e);
          const msg = err.status === 415 ? "Not a supported image" : errorMessage(err);
          setPending((p) => p.map((x) => (x.key === entry.key ? { ...x, status: "error", error: msg } : x)));
        } finally {
          setBatch((b) => ({ ...b, done: b.done + 1 }));
        }
      }),
    );
  }

  const dismiss = (key: string) =>
    setPending((p) => {
      const item = p.find((x) => x.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return p.filter((x) => x.key !== key);
    });

  /** True if `url` was uploaded in this session (and forgets it, since the caller is removing it). */
  const wasUploadedHere = (url: string) => uploadedHere.current.delete(url);

  return { pending, problems, batch, uploading, room, addFiles, dismiss, wasUploadedHere };
}
