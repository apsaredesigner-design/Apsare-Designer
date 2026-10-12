// Resolves a URL path against the App Router file tree, the way Next matches
// Route Handlers: per segment, a static folder beats `[param]`, which beats
// `[...catchAll]`, which beats `[[...optional]]`; `(group)` folders are
// transparent and `_private` folders are not routable. Backtracks, so
// /api/products/home picks products/home/route.ts over products/[slug]/route.ts.
// Segments stay percent-encoded for static matching (`/api/products/hom%65` is the
// [slug] "home", not products/home, as under `next start`); only params are decoded.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { CLIENT_DIR } from "../env";

export type Params = Record<string, string | string[] | undefined>;
export interface RouteMatch {
  file: string;
  params: Params;
}

/**
 * Trees mounted at /api, searched in order. The fixture tree (test-only routes
 * under /api/test-fixture) comes first so the app's /api/[...slug] catch-all can't shadow it.
 */
export const API_ROOTS = [path.join(CLIENT_DIR, "test/fixtures/api"), path.join(CLIENT_DIR, "src/app/api")];

const ROUTE_FILES = ["route.ts", "route.js"];
const routeFile = (dir: string) => ROUTE_FILES.map((f) => path.join(dir, f)).find((f) => existsSync(f));

function subdirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();
}

const OPTIONAL = /^\[\[\.\.\.(.+)\]\]$/;
const CATCH_ALL = /^\[\.\.\.(.+)\]$/;
const DYNAMIC = /^\[([^.[\]][^[\]]*)\]$/;
const GROUP = /^\(.+\)$/;

/** Next's DecodeError: a malformed percent-escape in a dynamic segment (`next start` answers a plain 500). */
export class PathDecodeError extends Error {}

/** Next (shared/lib/router/utils/route-matcher.js): `decodeURIComponent` per segment; `%2F` stays inside it. */
function decode(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    throw new PathDecodeError(`failed to decode param: ${seg}`);
  }
}

function match(dir: string, segs: string[], params: Params): RouteMatch | null {
  const dirs = subdirs(dir);
  if (segs.length === 0) {
    const file = routeFile(dir);
    if (file) return { file, params };
  } else {
    const [seg, ...rest] = segs;
    if (dirs.includes(seg) && !GROUP.test(seg) && !seg.startsWith("[")) {
      const m = match(path.join(dir, seg), rest, params);
      if (m) return m;
    }
  }
  for (const d of dirs.filter((d) => GROUP.test(d))) {
    const m = match(path.join(dir, d), segs, params);
    if (m) return m;
  }
  if (segs.length > 0) {
    for (const d of dirs) {
      const name = DYNAMIC.exec(d)?.[1];
      if (!name) continue;
      const m = match(path.join(dir, d), segs.slice(1), { ...params, [name]: decode(segs[0]) });
      if (m) return m;
    }
    for (const d of dirs) {
      const name = CATCH_ALL.exec(d)?.[1];
      const file = name && routeFile(path.join(dir, d));
      if (file) return { file, params: { ...params, [name]: segs.map(decode) } };
    }
  }
  for (const d of dirs) {
    const name = OPTIONAL.exec(d)?.[1];
    const file = name && routeFile(path.join(dir, d));
    if (file) return { file, params: { ...params, [name]: segs.length ? segs.map(decode) : undefined } };
  }
  return null;
}

/**
 * `/api/products/abc/reviews` → { file: …/api/products/[slug]/reviews/route.ts, params: { slug: "abc" } }.
 * The raw path is split on "/"; static folders match the raw segment, params are decoded
 * (`a%2Fb` → "a/b"); a malformed escape in a param throws PathDecodeError.
 */
export function resolveRoute(pathname: string): RouteMatch | null {
  if (pathname !== "/api" && !pathname.startsWith("/api/")) return null;
  const segs = pathname.slice("/api".length).split("/").filter(Boolean);
  for (const root of API_ROOTS) {
    if (!existsSync(root)) continue;
    const m = match(root, segs, {});
    if (m) return m;
  }
  return null;
}
