/**
 * Settings helpers (pure): pincode rules and bulk-paste parsing.
 *
 *   const { valid, invalid, duplicates } = parsePincodes("560001, 110001\n012345");
 *   await adminApi.settings.pincodes.bulk(valid.map((pincode) => ({ pincode })));
 */

export const PINCODE_RE = /^[1-9]\d{5}$/;
export const BULK_PINCODE_MAX = 1000;

/** Splits pasted text on commas, whitespace and newlines; keeps the first of each repeat. */
export function parsePincodes(text: string): { valid: string[]; invalid: string[]; duplicates: number } {
  const tokens = text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  for (const t of tokens) {
    if (seen.has(t)) {
      duplicates++;
      continue;
    }
    seen.add(t);
    (PINCODE_RE.test(t) ? valid : invalid).push(t);
  }
  return { valid, invalid, duplicates };
}

/** Parses a whole-number rupee/day input; null when blank or invalid. */
export function parseWhole(v: string): number | null {
  return /^\d+$/.test(v.trim()) ? Number(v) : null;
}
