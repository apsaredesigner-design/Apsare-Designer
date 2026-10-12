/**
 * Image upload helpers for POST/DELETE /api/uploads/image (admin only).
 *
 *   const items = await upload(files, { signal });     // UploadedImage[]
 *   await deleteUpload({ url, publicId });              // when the admin removes an image
 *   const problem = validateImageFile(file);            // client-side pre-check, null if ok
 *
 * `upload` sends multipart FormData with fetch + credentials and deliberately does NOT
 * set Content-Type (the browser adds the multipart boundary). The server's CSRF check
 * accepts multipart only under /api/uploads/. Errors are thrown as `ApiError`; a 401
 * redirects to the admin login like every other admin call.
 */
import { API_URL, ApiError } from "@/lib/api";
import { adminSend, redirectIfExpired } from "./api";
import type { UploadedImage } from "./types";

export const UPLOAD_LIMITS = {
  maxFiles: 10,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "image/avif"] as readonly string[],
  accept: "image/jpeg,image/png,image/webp,image/avif",
};

/** Returns a human message if the file would be rejected by the server, else null. */
export function validateImageFile(file: File): string | null {
  if (!UPLOAD_LIMITS.types.includes(file.type)) return `${file.name}: only JPEG, PNG, WebP or AVIF images are allowed.`;
  if (file.size > UPLOAD_LIMITS.maxBytes) return `${file.name}: larger than 5 MB.`;
  return null;
}

export async function upload(files: File[] | FileList, init: { signal?: AbortSignal } = {}): Promise<UploadedImage[]> {
  const list = Array.from(files);
  if (list.length === 0) return [];
  if (list.length > UPLOAD_LIMITS.maxFiles) throw new ApiError(400, `Upload at most ${UPLOAD_LIMITS.maxFiles} files at a time.`);

  const form = new FormData();
  for (const file of list) form.append("files", file);

  const res = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    body: form,
    credentials: "include",
    signal: init.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error;
    redirectIfExpired(new ApiError(res.status, err?.message ?? res.statusText, err?.code, err?.details ?? []));
  }
  return (body as { items: UploadedImage[] }).items;
}

export function deleteUpload(image: { url?: string; publicId?: string | null }) {
  const body = image.publicId ? { publicId: image.publicId } : { url: image.url };
  return adminSend<void>("DELETE", "/uploads/image", body);
}
