// Port of the removed Express suite's test/admin-access.test.ts: every admin and upload route must be
// guarded (401 for anonymous, 403 for a customer, nothing changed or audited), and
// the table must cover every route file and method under app/api/{admin,uploads}.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CLIENT_DIR } from "./env";
import { db } from "./helpers/db";
import { api, expectError, loginAs, type Api } from "./helpers/http";
import { resolveRoute } from "./helpers/router";

type M = "get" | "post" | "put" | "patch" | "delete";

const ROUTES: [method: M, path: string][] = [
  ["get", "/api/admin/dashboard"],
  ["get", "/api/admin/products"],
  ["post", "/api/admin/products"],
  ["post", "/api/admin/products/bulk"],
  ["get", "/api/admin/products/1"],
  ["patch", "/api/admin/products/1"],
  ["patch", "/api/admin/products/1/status"],
  ["delete", "/api/admin/products/1"],
  ["get", "/api/admin/categories"],
  ["get", "/api/admin/categories/tree"],
  ["post", "/api/admin/categories"],
  ["get", "/api/admin/categories/1"],
  ["patch", "/api/admin/categories/1"],
  ["delete", "/api/admin/categories/1"],
  ["get", "/api/admin/orders"],
  ["get", "/api/admin/orders/export.csv"],
  ["get", "/api/admin/orders/APS-260101-AAAAA"],
  ["patch", "/api/admin/orders/APS-260101-AAAAA/status"],
  ["get", "/api/admin/customers"],
  ["get", "/api/admin/customers/1"],
  ["patch", "/api/admin/customers/1/status"],
  ["patch", "/api/admin/customers/1/role"],
  ["get", "/api/admin/coupons"],
  ["post", "/api/admin/coupons"],
  ["get", "/api/admin/coupons/1"],
  ["patch", "/api/admin/coupons/1"],
  ["delete", "/api/admin/coupons/1"],
  ["get", "/api/admin/banners"],
  ["post", "/api/admin/banners"],
  ["put", "/api/admin/banners/reorder"],
  ["get", "/api/admin/banners/1"],
  ["patch", "/api/admin/banners/1"],
  ["delete", "/api/admin/banners/1"],
  ["get", "/api/admin/settings"],
  ["put", "/api/admin/settings"],
  ["get", "/api/admin/settings/pincodes"],
  ["post", "/api/admin/settings/pincodes"],
  ["post", "/api/admin/settings/pincodes/bulk"],
  ["patch", "/api/admin/settings/pincodes/560001"],
  ["delete", "/api/admin/settings/pincodes/560001"],
  ["get", "/api/admin/contact-messages"],
  ["patch", "/api/admin/contact-messages/1"],
  ["delete", "/api/admin/contact-messages/1"],
  ["get", "/api/admin/audit-log"],
  ["get", "/api/admin/reviews"],
  ["get", "/api/admin/reviews/1"],
  ["delete", "/api/admin/reviews/1"],
  ["get", "/api/admin/no-such-route"],
  ["post", "/api/uploads/image"],
  ["delete", "/api/uploads/image"],
  // Static twins: Express fell through to the `/:param` route for these methods (→ 400 params.x).
  ["get", "/api/admin/products/bulk"],
  ["patch", "/api/admin/products/bulk"],
  ["delete", "/api/admin/products/bulk"],
  ["patch", "/api/admin/categories/tree"],
  ["delete", "/api/admin/categories/tree"],
  ["get", "/api/admin/banners/reorder"],
  ["patch", "/api/admin/banners/reorder"],
  ["delete", "/api/admin/banners/reorder"],
  ["patch", "/api/admin/settings/pincodes/bulk"],
  ["delete", "/api/admin/settings/pincodes/bulk"],
  // Router-level guards run before the 404: unimplemented methods and unknown paths (catch-alls).
  ["post", "/api/admin/orders"],
  ["put", "/api/admin/banners/reorder/extra"],
  ["get", "/api/admin"],
  ["get", "/api/uploads/image"],
  ["post", "/api/uploads/no-such-route"],
];

// ─── Route files and methods declared on disk ───────────────────

const API_DIR = path.join(CLIENT_DIR, "src/app/api");
const PLACEHOLDERS: Record<string, string> = { "[id]": "1", "[orderNumber]": "APS-260101-AAAAA", "[pincode]": "560001" };

/** Every route.ts under app/api/{admin,uploads}, and `METHOD /path` for each method key it implements. */
function declaredRoutes() {
  const files: string[] = [];
  const methods = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "route.ts") {
        files.push(full);
        const segs = path.relative(API_DIR, dir).split(path.sep).map((s) => PLACEHOLDERS[s] ?? s);
        for (const m of readFileSync(full, "utf8").matchAll(/^\s+(GET|POST|PUT|PATCH|DELETE):/gm)) methods.add(`${m[1].toLowerCase()} /api/${segs.join("/")}`);
      }
    }
  };
  for (const root of ["admin", "uploads"]) walk(path.join(API_DIR, root));
  return { files, methods };
}

/** Admin + uploads method handlers in MIGRATION.md's frozen inventory (Phase 5 unit checklist). */
const PHASE5_ENDPOINTS = 49;

/** The Phase 5 checklist of MIGRATION.md as `method /path` (params replaced by the same placeholders). */
function inventory(): Set<string> {
  const doc = readFileSync(path.join(CLIENT_DIR, "..", "MIGRATION.md"), "utf8");
  const section = doc.slice(doc.indexOf("### Phase 5"), doc.indexOf("## Reuse index"));
  const names: Record<string, string> = { ":id": "1", ":orderNumber": "APS-260101-AAAAA", ":pincode": "560001" };
  const rows = [...section.matchAll(/^- \[[ x]\] (GET|POST|PUT|PATCH|DELETE) (\S+)/gm)].map(
    ([, m, p]) => `${m.toLowerCase()} ${p.split("/").map((s) => names[s] ?? s).join("/")}`,
  );
  expect(rows).toHaveLength(PHASE5_ENDPOINTS);
  return new Set(rows);
}

let customer: Api;
let admin: Api;
beforeAll(async () => {
  customer = api(await loginAs("customer"));
  admin = api(await loginAs("admin"));
});

const send = (client: Api, method: M, path: string) => (method === "get" ? client.get(path) : client[method](path, {}));

describe("admin route guards", () => {
  it.each(ROUTES)("%s %s → 401 for anonymous", async (method, path) => {
    expectError(await send(api(), method, path), 401, "UNAUTHENTICATED");
  });

  it.each(ROUTES)("%s %s → 403 for a customer", async (method, path) => {
    expectError(await send(customer, method, path), 403, "FORBIDDEN");
  });

  it("nothing a customer tried was changed or audit-logged", async () => {
    expect(await db.adminAuditLog.count()).toBe(0);
    expect(await db.serviceablePincode.count({ where: { pincode: "560001" } })).toBe(1);
  });

  it("the table covers every route file and method under app/api/admin and app/api/uploads", () => {
    const { files, methods } = declaredRoutes();
    const tabled = new Set(ROUTES.map(([m, p]) => `${m} ${p}`));
    // Exactly the frozen Phase 5 inventory: a missing or an extra handler fails.
    expect(methods.size).toBe(PHASE5_ENDPOINTS);
    expect([...methods].sort()).toEqual([...inventory()].sort());
    expect([...methods].filter((r) => !tabled.has(r))).toEqual([]);
    const reached = new Set(ROUTES.map(([, p]) => resolveRoute(p)?.file));
    expect(files.filter((f) => !reached.has(f)).map((f) => path.relative(API_DIR, f))).toEqual([]);
  });

  it("the admin gets through (sanity check on a few GETs)", async () => {
    for (const path of ["/api/admin/dashboard", "/api/admin/products", "/api/admin/orders", "/api/admin/audit-log"]) {
      expect((await admin.get(path)).status, path).toBe(200);
    }
    expectError(await admin.get("/api/admin/no-such-route"), 404, "NOT_FOUND");
    // Static twins answer like Express's `/:id` fall-through.
    expect(expectError(await admin.get("/api/admin/products/bulk"), 400, "VALIDATION_ERROR").details![0].path).toBe("params.id");
    expect(expectError(await admin.delete("/api/admin/categories/tree"), 400, "VALIDATION_ERROR").details![0].path).toBe("params.id");
    // uploads: the same guard, then a plain 404 (that router had no audit).
    expectError(await admin.post("/api/uploads/no-such-route", {}), 404, "NOT_FOUND");
    expect(await db.adminAuditLog.count({ where: { path: { startsWith: "/api/uploads" } } })).toBe(0);
  });

  it("an admin's 404 on a mutating request is audit-logged, like any admin mutation in Express", async () => {
    expectError(await admin.post("/api/admin/no-such-route", {}), 404, "NOT_FOUND");
    expectError(await admin.post("/api/admin/orders", {}), 404, "NOT_FOUND");
    const where = { path: { in: ["/api/admin/no-such-route", "/api/admin/orders"] } };
    for (let i = 0; i < 80 && (await db.adminAuditLog.count({ where })) < 2; i++) await new Promise((r) => setTimeout(r, 25));
    const rows = await db.adminAuditLog.findMany({ where, orderBy: { id: "asc" } });
    expect(rows.map((r) => [r.method, r.path, r.status])).toEqual([
      ["POST", "/api/admin/no-such-route", 404],
      ["POST", "/api/admin/orders", 404],
    ]);
  });
});
