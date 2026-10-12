import { z } from "zod";

// Zod schemas and limits for /api/uploads/image (extracted from server uploads.routes.ts).

/** Per-file size cap (multer `limits.fileSize`). */
export const MAX_BYTES = 5 * 1024 * 1024;
/** Files per request (multer `limits.files` and `upload.array("files", MAX_FILES)`). */
export const MAX_FILES = 10;

/** DELETE /api/uploads/image { publicId } | { url } */
export const deleteSchema = z
  .object({
    publicId: z.string().trim().min(1).max(200).optional(),
    url: z.string().trim().min(1).max(500).optional(),
  })
  .refine((b) => b.publicId || b.url, "Send publicId or url");
export type DeleteInput = z.infer<typeof deleteSchema>;
