import { z } from "zod";
import { likeSafe, searchQuery } from "../../utils/search";

/** `/:id` path param (shared with addresses: utils/params.ts). */
export { idParams, type IdParams } from "../../utils/params";

/** Query-string boolean: only "true" / "false" are accepted. */
export const queryBool = z.enum(["true", "false"]).transform((v) => v === "true");

/**
 * Normalised search term (utils/search.ts), already LIKE-escaped for Prisma
 * `contains` (so `%` and `_` match literally). Empty strings count as "not given".
 */
export const searchTerm = searchQuery(100).transform((v) => v && likeSafe(v));

/** Optional nullable text field: "" becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : v === undefined ? undefined : null));

/** Money in INR, up to Decimal(10,2). */
export const money = z.number().min(0).max(99_999_999).multipleOf(0.01);

/**
 * Image or link URL we are willing to store: an absolute http(s) URL or a
 * site-relative path ("/images/x.jpg"). Rejects `javascript:`, `data:`,
 * protocol-relative (`//evil.com`) and any URL containing a backslash
 * (browsers read `/\evil.com` as `//evil.com`).
 */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\/[^\s\\]+$/i.test(v) || /^\/(?!\/)[^\s\\]*$/.test(v), "Must be an http(s) URL or a path starting with /");

/** "Label Apsáre Silk!" -> "label-apsare-silk" */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "item";
}

/**
 * Returns `base`, or `base-2`, `base-3`… whichever is free. `taken` receives the
 * base and returns every existing slug starting with it (excluding the record
 * being edited). A concurrent insert still hits the unique index -> 409.
 */
export async function uniqueSlug(base: string, taken: (prefix: string) => Promise<string[]>): Promise<string> {
  const existing = new Set(await taken(base));
  if (!existing.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!existing.has(candidate)) return candidate;
  }
}

/** Maps a whitelisted `sort` value (a `z.enum`) to a Prisma orderBy: "createdAt_desc" -> { createdAt: "desc" }. */
type SortValue = `${string}_${"asc" | "desc"}`;
type SortField<S extends SortValue> = S extends `${infer F}_${"asc" | "desc"}` ? F : never;
export function toOrderBy<S extends SortValue>(sort: S): { [K in SortField<S>]?: "asc" | "desc" } {
  const i = sort.lastIndexOf("_");
  return { [sort.slice(0, i)]: sort.slice(i + 1) } as unknown as { [K in SortField<S>]?: "asc" | "desc" };
}
