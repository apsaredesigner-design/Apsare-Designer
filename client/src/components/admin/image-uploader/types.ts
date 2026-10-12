/** An image in the uploader's controlled `value` (see ImageUploader). */
export interface UploaderImage {
  /** Present for images already saved on the product. */
  id?: number;
  url: string;
  publicId: string | null;
  alt?: string | null;
}

/** A file that is uploading, or failed, and is not yet in `value`. */
export interface PendingUpload {
  key: string;
  name: string;
  preview: string;
  status: "uploading" | "error";
  error?: string;
}
