import { uploadGuard } from "@/server/http/guards";
import { created, guardedMethods, noContent, route } from "@/server/http/route";
import { deleteImage } from "@/server/modules/uploads/uploads.storage";
import { deleteSchema } from "@/server/modules/uploads/uploads.schemas";
import { readUploadFiles, uploadImages } from "@/server/modules/uploads/uploads.service";

// /api/uploads/image: admin only, uploadLimiter; no adminLimiter and no audit (as in Express).
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(uploadGuard, {
  /** Multipart field `files` (1–10 images, ≤ 5 MB each, jpeg/png/webp/avif) → 201 { items }. */
  POST: route({ ...uploadGuard, rawBody: true }, async (ctx) => created(await uploadImages(await readUploadFiles(ctx.req)))),
  /** { publicId } | { url } → 204. */
  DELETE: route({ ...uploadGuard, body: deleteSchema }, (ctx) => deleteImage(ctx.body).then(noContent)),
});
