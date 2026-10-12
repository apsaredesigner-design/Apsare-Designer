/**
 * isSafeUrl: the server's rule for admin-stored URLs (banner image and link, category
 * image): an http(s) URL or a site path with a single leading slash.
 *
 *   isSafeUrl("/new-arrivals") → true; isSafeUrl("javascript:alert(1)") → false
 */
export function isSafeUrl(v: string): boolean {
  if (v.includes("\\")) return false;
  if (/^\/(?!\/)/.test(v)) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
