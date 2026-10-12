import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../../config/env";
import { HttpError } from "../../utils/http-error";

export const CLOUDINARY_FOLDER = "apsare/products";

export type ImageType = "jpeg" | "png" | "webp" | "avif";
export const MIME_TYPES: Record<string, ImageType> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const EXT: Record<ImageType, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };

export interface StoredImage {
  url: string;
  /** Cloudinary public_id, or null for dev-local files (delete those by url). */
  publicId: string | null;
  format: ImageType;
  bytes: number;
  width?: number;
  height?: number;
}

/** Identifies the real image type from the file's first bytes; null if it is not one we accept. */
export function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  // ISO-BMFF: [size]["ftyp"][major brand][minor version][compatible brands…]
  if (buf.length >= 16 && buf.toString("ascii", 4, 8) === "ftyp") {
    const boxSize = Math.min(buf.readUInt32BE(0), buf.length, 64);
    const brands = [buf.toString("ascii", 8, 12)];
    for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(buf.toString("ascii", i, i + 4));
    if (brands.some((b) => b === "avif" || b === "avis")) return "avif";
  }
  return null;
}

export const cloudinaryEnabled = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Dev fallback: client/public/uploads, served by Next.js at /uploads/<name>.
 * Resolved from the cwd (the client/ workspace for `next dev|start` and `npm test -w client`):
 * in a Next bundle `import.meta.url` points into .next/, so the Express file-relative path can't be used.
 */
export const LOCAL_DIR = path.resolve(process.cwd(), "public/uploads");
/** Names we generate: <uuid>.<ext>. Anything else is refused on delete. */
const LOCAL_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/;
const PUBLIC_ID = new RegExp(`^${CLOUDINARY_FOLDER}/[A-Za-z0-9_-]{1,100}$`);

function uploadToCloudinary(buf: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUDINARY_FOLDER, resource_type: "image", unique_filename: true, use_filename: false, overwrite: false },
      (err, result) => (err || !result ? reject(err ?? new Error("Cloudinary upload failed")) : resolve(result)),
    );
    stream.end(buf);
  });
}

export async function storeImage(buf: Buffer, type: ImageType): Promise<StoredImage> {
  if (cloudinaryEnabled) {
    const r = await uploadToCloudinary(buf);
    return { url: r.secure_url, publicId: r.public_id, format: type, bytes: r.bytes, width: r.width, height: r.height };
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  const name = `${randomUUID()}.${EXT[type]}`; // never the client's filename
  await writeFile(path.join(LOCAL_DIR, name), buf, { flag: "wx" });
  return { url: `/uploads/${name}`, publicId: null, format: type, bytes: buf.length };
}

/** "https://res.cloudinary.com/<cloud>/image/upload/v123/apsare/products/abc.jpg" -> "apsare/products/abc" */
function publicIdFromUrl(url: string): string | null {
  const m = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url);
  return m && PUBLIC_ID.test(m[1]) ? m[1] : null;
}

/**
 * Deletes an image we stored. Only accepts Cloudinary ids inside our folder or
 * `/uploads/<uuid>.<ext>` local files, so it cannot reach anything else.
 */
export async function deleteImage(ref: { publicId?: string; url?: string }): Promise<void> {
  const local = ref.url?.startsWith("/uploads/") ? ref.url.slice("/uploads/".length) : null;
  if (local !== null) {
    if (!LOCAL_NAME.test(local)) throw new HttpError(400, "Not a deletable upload", "BAD_REQUEST");
    const file = path.resolve(LOCAL_DIR, local);
    if (path.dirname(file) !== LOCAL_DIR) throw new HttpError(400, "Not a deletable upload", "BAD_REQUEST");
    try {
      await unlink(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new HttpError(404, "Image not found");
      throw err;
    }
    return;
  }

  const publicId = ref.publicId ?? (ref.url ? publicIdFromUrl(ref.url) : null);
  if (!publicId || !PUBLIC_ID.test(publicId)) throw new HttpError(400, "Not a deletable upload", "BAD_REQUEST");
  if (!cloudinaryEnabled) throw new HttpError(503, "Cloudinary is not configured", "UPLOADS_UNAVAILABLE");
  const r = (await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true })) as { result?: string };
  if (r.result === "not found") throw new HttpError(404, "Image not found");
  if (r.result !== "ok") throw new HttpError(502, "Cloudinary could not delete the image", "UPSTREAM_ERROR");
}
