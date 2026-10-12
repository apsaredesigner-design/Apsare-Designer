import { HttpError } from "../../utils/http-error";
import { MAX_BYTES, MAX_FILES } from "./uploads.schemas";
import { MIME_TYPES, sniffImageType, storeImage, type StoredImage } from "./uploads.storage";

// Admin image uploads (logic extracted from server uploads.routes.ts; storage in
// uploads.storage.ts). multer is gone: readUploadFiles() re-implements the limits
// and error mapping it applied, on top of the Web `Request.formData()`.

/** One received file, like multer's `Express.Multer.File` (the fields the handler used). */
export interface UploadFile {
  fieldname: string;
  mimetype: string;
  buffer: Buffer;
}

/** multer limits: fields 5, parts MAX_FILES + 5; busboy defaults: field name 100 bytes, field value 1 MB. */
const MAX_FIELDS = 5;
const MAX_PARTS = MAX_FILES + 5;
const MAX_FIELD_NAME_BYTES = 100;
const MAX_FIELD_VALUE_BYTES = 1024 * 1024;
/** Whole-body cap before parsing (Route Handlers have no body limit): every file at the max, plus room for boundaries and fields. */
export const MAX_UPLOAD_BODY_BYTES = MAX_FILES * MAX_BYTES + 1024 * 1024;

const FILE_TOO_LARGE = () => new HttpError(413, `Each image must be ${MAX_BYTES / 1024 / 1024} MB or smaller`);
const MALFORMED = () => new HttpError(400, "Malformed multipart upload");

/** Reads the body with a byte cap (checks Content-Length first, then counts while streaming). */
async function readCapped(request: Request): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BODY_BYTES) throw FILE_TOO_LARGE();
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_UPLOAD_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw FILE_TOO_LARGE();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Port of `receiveFiles` (multer `upload.array("files", 10)` + fileFilter). Parses a
 * multipart/form-data body and applies, in part order, the same rules and errors:
 * - more than 15 parts → 400 "Too many parts"; more than 5 non-file fields → 400 "Too many fields"
 * - more than 10 files → 400 "At most 10 images per request"
 * - a file outside the `files` field → 400 `Send images in the "files" field (at most 10)`
 * - a declared type other than jpeg/png/webp/avif → 415 UNSUPPORTED_MEDIA_TYPE "Unsupported file type: <type>"
 * - a file over 5 MB → 413 "Each image must be 5 MB or smaller" (also for a body over MAX_UPLOAD_BODY_BYTES)
 * - an unparseable body → 400 "Malformed multipart upload"
 * A request that is not multipart/form-data yields [] (multer skipped it). Consumes the request body,
 * so pass `ctx.req` and use `route({ rawBody: true })`.
 */
export async function readUploadFiles(request: Request): Promise<UploadFile[]> {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "multipart/form-data") return [];

  const body = await readCapped(request);
  let form: FormData;
  try {
    form = await new Request("http://upload.local/", { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body }).formData();
  } catch {
    throw MALFORMED();
  }

  const files: UploadFile[] = [];
  let parts = 0;
  let fields = 0;
  for (const [fieldname, value] of form.entries()) {
    if (++parts > MAX_PARTS) throw new HttpError(400, "Too many parts");
    if (Buffer.byteLength(fieldname) > MAX_FIELD_NAME_BYTES) throw new HttpError(400, "Field name too long");
    if (typeof value === "string") {
      if (++fields > MAX_FIELDS) throw new HttpError(400, "Too many fields");
      if (Buffer.byteLength(value) > MAX_FIELD_VALUE_BYTES) throw new HttpError(400, "Field value too long");
      continue;
    }
    if (files.length + 1 > MAX_FILES) throw new HttpError(400, `At most ${MAX_FILES} images per request`);
    if (fieldname !== "files") throw new HttpError(400, `Send images in the "files" field (at most ${MAX_FILES})`);
    const mimetype = value.type || "application/octet-stream";
    if (!MIME_TYPES[mimetype]) throw new HttpError(415, `Unsupported file type: ${mimetype}`, "UNSUPPORTED_MEDIA_TYPE");
    if (value.size > MAX_BYTES) throw FILE_TOO_LARGE();
    files.push({ fieldname, mimetype, buffer: Buffer.from(await value.arrayBuffer()) });
  }
  return files;
}

/**
 * POST /api/uploads/image: 1–10 images, ≤ 5 MB each, jpeg/png/webp/avif. The declared
 * mimetype AND the file's magic bytes must agree. All files are checked before any is
 * stored. The route answers 201 with the result.
 */
export async function uploadImages(files: UploadFile[]): Promise<{ items: StoredImage[] }> {
  if (!files.length) throw new HttpError(400, 'No images received (use multipart field "files")');

  const checked = files.map((f, i) => {
    const type = sniffImageType(f.buffer);
    if (!type || type !== MIME_TYPES[f.mimetype]) {
      throw new HttpError(415, "File content is not a valid JPEG, PNG, WebP or AVIF image", "UNSUPPORTED_MEDIA_TYPE", [
        { path: `files.${i}`, message: "Content does not match an allowed image type" },
      ]);
    }
    return { buf: f.buffer, type };
  });

  const items = [];
  for (const f of checked) items.push(await storeImage(f.buf, f.type));
  return { items };
}
