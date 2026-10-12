import { z } from "zod";

/**
 * Normalises free-text search input: NFKC (full-width and compatibility forms
 * fold to plain letters), invisible format characters (zero-width, bidi
 * overrides) removed so "si\u200Blk" is "silk", control characters (NUL, tabs,
 * newlines) turned into spaces, whitespace collapsed.
 */
export function cleanSearch(value: string): string {
  return value.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
}

/** Escape LIKE wildcards: Prisma `contains` passes `%` / `_` through, so `q=%` would match everything. */
export const likeSafe = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/** `?q=`: at most `max` characters (else 400); blank or invisible-only input counts as "not given". */
export const searchQuery = (max = 100) =>
  z
    .string()
    .max(max * 2) // cheap guard before normalising; the real limit is checked after
    .transform(cleanSearch)
    .pipe(z.string().max(max))
    .optional()
    .transform((v) => v || undefined);
