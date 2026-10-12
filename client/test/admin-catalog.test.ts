// Port of the Phase 5a parts of the removed Express suite's test/admin-ops.test.ts (same assertions):
// admin categories, customers, reviews, and the audit hook as seen through the
// categories routes. Orders, CSV export and verified-purchase reviews belong to
// admin-orders-ops.test.ts and reviews.test.ts.
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { createCategory, createProduct, createUser } from "./helpers/factories";
import { api, expectError, loginAs, loginWith, type Api } from "./helpers/http";

const ME = "/api/auth/me";

let admin: Api;
let adminId: number;
beforeAll(async () => {
  admin = api(await loginAs("admin"));
  adminId = (await admin.get(ME)).body.user.id;
});

const waitFor = async <T>(fn: () => Promise<T | null | undefined>, ms = 2000): Promise<T> => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 25));
  }
};

describe("admin categories", () => {
  it("moving a category under itself or a descendant is 409 CATEGORY_CYCLE", async () => {
    const a = await createCategory();
    const b = await createCategory({ parentId: a.id });
    const c = await createCategory({ parentId: b.id });
    expectError(await admin.patch(`/api/admin/categories/${a.id}`, { parentId: a.id }), 409, "CATEGORY_CYCLE");
    expectError(await admin.patch(`/api/admin/categories/${a.id}`, { parentId: c.id }), 409, "CATEGORY_CYCLE");
    expect((await db.category.findUniqueOrThrow({ where: { id: a.id } })).parentId).toBeNull();
    expect((await admin.patch(`/api/admin/categories/${c.id}`, { parentId: null })).status).toBe(200);
    expectError(await admin.patch(`/api/admin/categories/${a.id}`, { parentId: 99999999 }), 400, "VALIDATION_ERROR");
  });

  it("refuses to delete a category in use", async () => {
    const parent = await createCategory();
    await createCategory({ parentId: parent.id });
    expectError(await admin.delete(`/api/admin/categories/${parent.id}`), 409, "CATEGORY_IN_USE");
  });
});

describe("admin customers", () => {
  it("an admin cannot deactivate themselves or change their own role", async () => {
    expectError(await admin.patch(`/api/admin/customers/${adminId}/status`, { isActive: false }), 400, "SELF_DEACTIVATION");
    expectError(await admin.patch(`/api/admin/customers/${adminId}/role`, { role: "CUSTOMER" }), 400, "SELF_ROLE_CHANGE");
    expect(await db.user.findUniqueOrThrow({ where: { id: adminId } })).toMatchObject({ role: "ADMIN", isActive: true });
  });

  it("deactivating a customer ends their session and blocks login; reactivating restores it", async () => {
    const user = await createUser();
    const session = api(await loginWith(user.email, user.password));
    const res = await admin.patch(`/api/admin/customers/${user.id}/status`, { isActive: false });
    expect(res.body).toEqual({ id: user.id, isActive: false });
    expectError(await session.get(ME), 401, "UNAUTHENTICATED");
    expectError(await api().post("/api/auth/login", { identifier: user.email, password: user.password }), 403, "ACCOUNT_DISABLED");
    await admin.patch(`/api/admin/customers/${user.id}/status`, { isActive: true });
    expect((await api().post("/api/auth/login", { identifier: user.email, password: user.password })).status).toBe(200);
  });

  it("promoting and demoting takes effect on the next request", async () => {
    const user = await createUser();
    const session = api(await loginWith(user.email, user.password));
    expectError(await session.get("/api/admin/dashboard"), 403, "FORBIDDEN");
    expect((await admin.patch(`/api/admin/customers/${user.id}/role`, { role: "ADMIN" })).body).toEqual({ id: user.id, role: "ADMIN", isActive: true });
    expect((await session.get("/api/admin/dashboard")).status).toBe(200);

    // The promoted admin cannot demote themselves either, but can be demoted by another admin.
    expectError(await session.patch(`/api/admin/customers/${user.id}/role`, { role: "CUSTOMER" }), 400, "SELF_ROLE_CHANGE");
    await admin.patch(`/api/admin/customers/${user.id}/role`, { role: "CUSTOMER" });
    expectError(await session.get("/api/admin/dashboard"), 403, "FORBIDDEN");
    expectError(await admin.patch(`/api/admin/customers/99999999/role`, { role: "ADMIN" }), 404, "NOT_FOUND");
    expectError(await admin.patch(`/api/admin/customers/${user.id}/role`, { role: "ROOT" }), 400, "VALIDATION_ERROR");
  });

  it("customer detail never includes the password hash", async () => {
    const user = await createUser();
    const res = await admin.get(`/api/admin/customers/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe("admin reviews", () => {
  it("deleting a review recomputes the product rating (0/0 after the last)", async () => {
    const product = await createProduct();
    const [u1, u2] = [await createUser(), await createUser()];
    const r5 = await db.review.create({ data: { productId: product.id, userId: u1.id, rating: 5, comment: "Lovely" } });
    const r2 = await db.review.create({ data: { productId: product.id, userId: u2.id, rating: 2, comment: "Meh" } });
    await db.product.update({ where: { id: product.id }, data: { ratingAvg: 3.5, ratingCount: 2 } });

    expect((await admin.delete(`/api/admin/reviews/${r2.id}`)).status).toBe(204);
    let p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect([Number(p.ratingAvg), p.ratingCount]).toEqual([5, 1]);

    expect((await admin.delete(`/api/admin/reviews/${r5.id}`)).status).toBe(204);
    p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect([Number(p.ratingAvg), p.ratingCount]).toEqual([0, 0]);
    expectError(await admin.delete(`/api/admin/reviews/${r5.id}`), 404, "NOT_FOUND");
  });
});

describe("admin audit log", () => {
  it("records mutating admin requests (not GETs) with the target id and no body", async () => {
    await admin.get("/api/admin/categories");
    const created = await admin.post("/api/admin/categories", { name: "Audit Test" });
    expect(created.status).toBe(201);
    await admin.patch(`/api/admin/categories/${created.body.id}`, { description: "secret body text" });

    const rows = await waitFor(async () => {
      const r = await db.adminAuditLog.findMany({
        where: { OR: [{ method: "POST", path: "/api/admin/categories" }, { path: `/api/admin/categories/${created.body.id}` }] },
        orderBy: { id: "asc" },
      });
      return r.length >= 2 ? r : null;
    });
    expect(rows).toHaveLength(2);
    expect(await db.adminAuditLog.count({ where: { method: "GET" } })).toBe(0);
    expect(rows[0]).toMatchObject({ adminId, method: "POST", path: "/api/admin/categories", status: 201, targetId: null });
    expect(rows[1]).toMatchObject({ adminId, method: "PATCH", path: `/api/admin/categories/${created.body.id}`, status: 200, targetId: String(created.body.id) });
    expect(JSON.stringify(rows)).not.toContain("secret body text");

    const failed = await admin.delete("/api/admin/categories/99999999");
    expect(failed.status).toBe(404);
    const row = await waitFor(() => db.adminAuditLog.findFirst({ where: { method: "DELETE", path: "/api/admin/categories/99999999" } }));
    expect(row).toMatchObject({ status: 404, targetId: "99999999" });

    const list = await admin.get("/api/admin/audit-log");
    expect(list.body.items[0]).toMatchObject({ method: "DELETE", admin: { id: adminId } });
  });
});
