// Express's default `etag fn` (weak, from the `etag` package) and its `req.fresh`
// check (the `fresh` package). Express 5 `res.send` put a weak ETag on every
// JSON body (any method, any status) and answered a conditional GET/HEAD whose
// 2xx response was still fresh with 304 and no body.
import { createHash } from "node:crypto";

/** `W/"<byte length hex>-<sha1 base64, first 27 chars>"`, byte-for-byte what `etag(body, { weak: true })` returns. */
export function weakEtag(body: string): string {
  const hash = createHash("sha1").update(body, "utf8").digest("base64").slice(0, 27);
  return `W/"${Buffer.byteLength(body, "utf8").toString(16)}-${hash}"`;
}

const NO_CACHE = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;

/** `fresh`'s token-list parser (splits on commas, trims spaces). */
function parseTokenList(value: string): string[] {
  let end = 0;
  let start = 0;
  const list: string[] = [];
  for (let i = 0; i < value.length; i++) {
    switch (value.charCodeAt(i)) {
      case 0x20:
        if (start === end) start = end = i + 1;
        break;
      case 0x2c:
        list.push(value.substring(start, end));
        start = end = i + 1;
        break;
      default:
        end = i + 1;
    }
  }
  list.push(value.substring(start, end));
  return list;
}

/**
 * Express `req.fresh`: only GET/HEAD with a 2xx (or 304) response; `Cache-Control: no-cache`
 * on the request forces stale; `If-None-Match` (`*`, or a weak/strong match of the ETag) wins over
 * `If-Modified-Since` (fresh only when a `Last-Modified` is not newer).
 */
export function isFresh(method: string, status: number, reqHeaders: Headers, resHeaders: Headers): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  if (!((status >= 200 && status < 300) || status === 304)) return false;

  const modifiedSince = reqHeaders.get("if-modified-since");
  const noneMatch = reqHeaders.get("if-none-match");
  if (!modifiedSince && !noneMatch) return false;
  const cacheControl = reqHeaders.get("cache-control");
  if (cacheControl && NO_CACHE.test(cacheControl)) return false;

  if (noneMatch) {
    if (noneMatch === "*") return true;
    const etag = resHeaders.get("etag");
    if (!etag) return false;
    return parseTokenList(noneMatch).some((m) => m === etag || m === `W/${etag}` || `W/${m}` === etag);
  }

  const lastModified = resHeaders.get("last-modified");
  return !!lastModified && Date.parse(lastModified) <= Date.parse(modifiedSince!);
}

/** Express's 304: same headers minus Content-Type / Content-Length / Transfer-Encoding, no body. */
export function notModified(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const h of ["content-type", "content-length", "transfer-encoding"]) headers.delete(h);
  void res.body?.cancel();
  return new Response(null, { status: 304, headers });
}
