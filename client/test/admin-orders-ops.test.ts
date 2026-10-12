// Port of the removed Express suite's test/admin-ops.test.ts (Phase 5b parts: order status, CSV export,
// audit log) plus the coupon / banner / settings / pincode / contact rules.
import { beforeAll, describe, expect, it } from "vitest";
import { checkout, shopper } from "./helpers/checkout";
import { db } from "./helpers/db";
import { createAddress, createCoupon, createProduct, stockOf } from "./helpers/factories";
import { ADMIN, api, expectError, loginAs, ORIGIN, type Api } from "./helpers/http";

let admin: Api;
let adminId: number;
beforeAll(async () => {
  admin = api(await loginAs("admin"));
  adminId = (await db.user.findUniqueOrThrow({ where: { email: ADMIN.email } })).id;
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

async function newOrder(opts: { quantity?: number; stock?: number; couponCode?: string } = {}) {
  const { api: customer, user } = await shopper();
  const product = await createProduct({ variants: [{ stock: opts.stock ?? 10 }] });
  const order = await checkout(customer, user.id, [{ variantId: product.variants[0].id, quantity: opts.quantity ?? 2 }], { couponCode: opts.couponCode });
  return { order, product, customer, user };
}

describe("admin order status", () => {
  it("rejects invalid transitions and walks the valid chain; COD becomes PAID on delivery", async () => {
    const { order } = await newOrder();
    const path = `/api/admin/orders/${order.orderNumber}/status`;
    expectError(await admin.patch(path, { status: "DELIVERED" }), 409, "INVALID_STATUS_TRANSITION");
    expectError(await admin.patch(path, { status: "SHIPPED" }), 409, "INVALID_STATUS_TRANSITION");
    expectError(await admin.patch(path, { status: "LOST" }), 400, "VALIDATION_ERROR");

    let last;
    for (const status of ["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      last = await admin.patch(path, { status, note: `to ${status}` });
      expect(last.status, `${status}: ${JSON.stringify(last.body)}`).toBe(200);
      expect(last.body.status).toBe(status);
    }
    expect(last!.body).toMatchObject({ paymentStatus: "PAID", nextStatuses: [] });
    expect(last!.body.payments.every((p: { status: string }) => p.status === "PAID")).toBe(true);
    expect(last!.body.statusHistory.map((h: { status: string }) => h.status)).toEqual(["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(last!.body.idempotencyKey).toBeUndefined();

    expectError(await admin.patch(path, { status: "CANCELLED" }), 409, "INVALID_STATUS_TRANSITION");
    expectError(await admin.patch(`/api/admin/orders/APS-000000-ZZZZZ/status`, { status: "CONFIRMED" }), 404, "NOT_FOUND");
  });

  it("an admin cancel restocks, reverses soldCount and the coupon, and fails the payment", async () => {
    const coupon = await createCoupon();
    const { order, product } = await newOrder({ quantity: 3, stock: 5, couponCode: coupon.code });
    expect(await stockOf(product.variants[0].id)).toBe(2);
    const path = `/api/admin/orders/${order.orderNumber}/status`;
    expect((await admin.patch(path, { status: "CONFIRMED" })).status).toBe(200);
    const res = await admin.patch(path, { status: "CANCELLED", note: "Customer called" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "CANCELLED", paymentStatus: "FAILED", nextStatuses: [] });
    expect(await stockOf(product.variants[0].id)).toBe(5);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).soldCount).toBe(0);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);
    expectError(await admin.patch(path, { status: "CANCELLED" }), 409, "INVALID_STATUS_TRANSITION");
    expect(await stockOf(product.variants[0].id)).toBe(5);
  });

  it("list and detail: nextStatuses on the detail, 404 for an unknown order, userId filter", async () => {
    const { order, user } = await newOrder();
    const detail = await admin.get(`/api/admin/orders/${order.orderNumber}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ orderNumber: order.orderNumber, status: "PLACED", nextStatuses: ["CONFIRMED", "CANCELLED"], user: { id: user.id } });
    expectError(await admin.get("/api/admin/orders/APS-000000-ZZZZZ"), 404, "NOT_FOUND");
    const list = await admin.get(`/api/admin/orders?userId=${user.id}`);
    expect(list.status).toBe(200);
    expect(list.body.items.map((o: { orderNumber: string }) => o.orderNumber)).toEqual([order.orderNumber]);
    expectError(await admin.get("/api/admin/orders?from=2026-02-01&to=2026-01-01"), 400, "VALIDATION_ERROR");
  });
});

describe("admin CSV export", () => {
  it("escapes formula cells and quotes commas/quotes, with BOM and CRLF", async () => {
    const { api: customer, user } = await shopper({ fullName: '=HYPERLINK("http://evil","x")' });
    const product = await createProduct();
    const address = await db.address.update({
      where: { id: (await createAddress(user.id)).id },
      data: { fullName: "@SUM(1,2)", city: "+Bengaluru", state: "-Karnataka" },
    });
    const placed = await checkout(customer, user.id, [{ variantId: product.variants[0].id }], { addressId: address.id });

    const res = await admin.get(`/api/admin/orders/export.csv?userId=${user.id}`);
    // The harness decodes with Response.text(), which drops a leading BOM; read the raw bytes too.
    const { GET } = await import("@/app/api/admin/orders/export.csv/route");
    const raw = await GET(
      new Request(`${ORIGIN}/api/admin/orders/export.csv?userId=${user.id}`, { headers: { Cookie: admin.agent.jar.header() ?? "" } }),
      { params: Promise.resolve({}) },
    );
    const text = Buffer.from(await raw.arrayBuffer()).toString("utf8");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.text).toBe(text.slice(1));
    expect(text.startsWith("﻿orderNumber,createdAt,status,")).toBe(true);
    const lines = text.slice(1).split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    const row = lines[1];
    expect(row).toContain(placed.orderNumber);
    expect(row).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(row).toContain(`"'@SUM(1,2)"`);
    expect(row).toContain(",'+Bengaluru,'-Karnataka,");
    expect(row).not.toMatch(/(^|,)[=+@-]/);

    expectError(await admin.get("/api/admin/orders/export.csv?from=2026-02-01&to=2026-01-01"), 400, "VALIDATION_ERROR");
  });
});

describe("admin coupons", () => {
  it("creates (201), validates cross-field rules, and refuses to delete a used coupon (409 COUPON_IN_USE)", async () => {
    const created = await admin.post("/api/admin/coupons", { code: " new10 ", type: "PERCENT", value: 10, maxDiscount: 500 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code: "NEW10", type: "PERCENT", value: 10, maxDiscount: 500 });
    expectError(await admin.post("/api/admin/coupons", { code: "NEW10", type: "FLAT", value: 10 }), 409, "CONFLICT");
    const pct = expectError(await admin.post("/api/admin/coupons", { code: "BIG95", type: "PERCENT", value: 95 }), 400, "VALIDATION_ERROR");
    expect(pct.details?.[0].path).toBe("body.value");
    // PATCH validates against the merged (stored + incoming) values.
    const flat = expectError(await admin.patch(`/api/admin/coupons/${created.body.id}`, { type: "FLAT" }), 400, "VALIDATION_ERROR");
    expect(flat.details?.map((d) => d.path)).toEqual(["body.maxDiscount"]);
    expect((await admin.get(`/api/admin/coupons/${created.body.id}`)).body).toMatchObject({ code: "NEW10", _count: { orders: 0 } });
    expectError(await admin.get("/api/admin/coupons/99999999"), 404, "NOT_FOUND");

    const used = await createCoupon();
    await newOrder({ couponCode: used.code });
    expectError(await admin.delete(`/api/admin/coupons/${used.id}`), 409, "COUPON_IN_USE");
    const del = await admin.delete(`/api/admin/coupons/${created.body.id}`);
    expect(del.status).toBe(204);
    expect(del.text).toBe("");
    expectError(await admin.delete(`/api/admin/coupons/${created.body.id}`), 404, "NOT_FOUND");
  });
});

describe("admin banners", () => {
  it("rejects unsafe URLs, appends new banners at the end, reorders and deletes", async () => {
    for (const imageUrl of ["javascript:alert(1)", "//evil.com/x.jpg", "/\\evil.com", "data:image/png;base64,AAAA"]) {
      const e = expectError(await admin.post("/api/admin/banners", { title: "Bad", imageUrl }), 400, "VALIDATION_ERROR");
      expect(e.details?.[0].path).toBe("body.imageUrl");
    }
    expectError(await admin.post("/api/admin/banners", { title: "Bad", imageUrl: "/b.jpg", ctaHref: "javascript:x" }), 400, "VALIDATION_ERROR");

    const a = await admin.post("/api/admin/banners", { title: "A", imageUrl: "/a.jpg" });
    const b = await admin.post("/api/admin/banners", { title: "B", imageUrl: "https://cdn.example.com/b.jpg" });
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(b.body.sortOrder).toBe(a.body.sortOrder + 1);

    const reordered = await admin.put("/api/admin/banners/reorder", { ids: [b.body.id, a.body.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.items.slice(0, 2).map((x: { id: number }) => x.id)).toEqual([b.body.id, a.body.id]);
    expect(reordered.body.items.map((x: { sortOrder: number }) => x.sortOrder)).toEqual(reordered.body.items.map((_: unknown, i: number) => i));
    const unknown = expectError(await admin.put("/api/admin/banners/reorder", { ids: [99999999] }), 400, "VALIDATION_ERROR");
    expect(unknown.details).toEqual([{ path: "body.ids", message: "Unknown id" }]);
    // Other methods on the static twin behave like Express's fall-through to /:id.
    expect(expectError(await admin.get("/api/admin/banners/reorder"), 400, "VALIDATION_ERROR").details?.[0].path).toBe("params.id");

    expect((await admin.patch(`/api/admin/banners/${a.body.id}`, { isActive: false })).body).toMatchObject({ id: a.body.id, isActive: false });
    expect((await admin.get("/api/admin/banners?isActive=false")).body.items.map((x: { id: number }) => x.id)).toContain(a.body.id);
    expect((await admin.delete(`/api/admin/banners/${a.body.id}`)).status).toBe(204);
    expectError(await admin.get(`/api/admin/banners/${a.body.id}`), 404, "NOT_FOUND");
    expectError(await admin.patch(`/api/admin/banners/${a.body.id}`, { title: "x" }), 404, "NOT_FOUND");
    expectError(await admin.delete(`/api/admin/banners/${a.body.id}`), 404, "NOT_FOUND");
  });
});

describe("admin settings and pincodes", () => {
  it("reads and replaces the store settings", async () => {
    const got = await admin.get("/api/admin/settings");
    expect(got.status).toBe(200);
    expect(Object.keys(got.body).sort()).toEqual(["codFee", "deliveryCharge", "freeShippingThreshold", "updatedAt"]);
    const put = await admin.put("/api/admin/settings", { deliveryCharge: 79, freeShippingThreshold: 1999, codFee: 49.5 });
    expect(put.body).toMatchObject({ deliveryCharge: 79, freeShippingThreshold: 1999, codFee: 49.5 });
    expectError(await admin.put("/api/admin/settings", { deliveryCharge: 79 }), 400, "VALIDATION_ERROR");
    expectError(await admin.put("/api/admin/settings", { deliveryCharge: 20000, freeShippingThreshold: 0, codFee: 0 }), 400, "VALIDATION_ERROR");
  });

  it("adds, bulk-adds, filters, updates and deletes pincodes", async () => {
    const dup = expectError(await admin.post("/api/admin/settings/pincodes", { pincode: "560001" }), 409, "CONFLICT");
    expect(dup.details?.[0].path).toBe("pincode");
    expectError(await admin.post("/api/admin/settings/pincodes", { pincode: "12345" }), 400, "VALIDATION_ERROR");
    const added = await admin.post("/api/admin/settings/pincodes", { pincode: "999001", deliveryDays: 4, codAvailable: false });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ pincode: "999001", deliveryDays: 4, codAvailable: false });

    const bulk = await admin.post("/api/admin/settings/pincodes/bulk", {
      pincodes: [{ pincode: "999002" }, { pincode: "999002", deliveryDays: 9 }, { pincode: "999001" }, { pincode: "999003" }],
    });
    expect(bulk.status).toBe(201);
    expect(bulk.body).toEqual({ received: 4, added: 2, skipped: 2 });
    expectError(await admin.patch("/api/admin/settings/pincodes/bulk", { codAvailable: true }), 400, "VALIDATION_ERROR");

    const list = await admin.get("/api/admin/settings/pincodes?q=9990&sort=pincode_desc");
    expect(list.body.items.map((p: { pincode: string }) => p.pincode)).toEqual(["999003", "999002", "999001"]);
    expectError(await admin.get("/api/admin/settings/pincodes?q=abc"), 400, "VALIDATION_ERROR");

    expectError(await admin.patch("/api/admin/settings/pincodes/999002", {}), 400, "VALIDATION_ERROR");
    expect((await admin.patch("/api/admin/settings/pincodes/999002", { codAvailable: false })).body).toMatchObject({ pincode: "999002", codAvailable: false });
    expectError(await admin.patch("/api/admin/settings/pincodes/999999", { codAvailable: false }), 404, "NOT_FOUND");
    expect((await admin.delete("/api/admin/settings/pincodes/999002")).status).toBe(204);
    expectError(await admin.delete("/api/admin/settings/pincodes/999002"), 404, "NOT_FOUND");
  });
});

describe("admin contact messages", () => {
  it("lists, marks read and deletes; an unknown id is 404", async () => {
    const msg = await db.contactMessage.create({ data: { name: "Asha", email: "asha@example.com", subject: "Sizing", message: "Hello there, a question." } });
    const unread = await admin.get("/api/admin/contact-messages?isRead=false");
    expect(unread.body.items.map((m: { id: number }) => m.id)).toContain(msg.id);
    expect((await admin.patch(`/api/admin/contact-messages/${msg.id}`, { isRead: true })).body).toMatchObject({ id: msg.id, isRead: true });
    expectError(await admin.patch(`/api/admin/contact-messages/${msg.id}`, { isRead: "yes" }), 400, "VALIDATION_ERROR");
    expect((await admin.delete(`/api/admin/contact-messages/${msg.id}`)).status).toBe(204);
    expectError(await admin.delete(`/api/admin/contact-messages/${msg.id}`), 404, "NOT_FOUND");
    expectError(await admin.patch("/api/admin/contact-messages/99999999", { isRead: true }), 404, "NOT_FOUND");
  });
});

describe("admin audit log", () => {
  // Same assertions as the server test, on this phase's own routes (banners instead of categories).
  it("records mutating admin requests (not GETs) with the target id and no body", async () => {
    // Audit rows are written fire-and-forget (auditAdminMutations), after the response
    // is sent, so an earlier test's write can still be in flight here. Delete, briefly
    // let any straggler land, then delete again so this test starts from a clean table.
    await db.adminAuditLog.deleteMany();
    await new Promise((r) => setTimeout(r, 100));
    await db.adminAuditLog.deleteMany();
    await admin.get("/api/admin/banners");
    const created = await admin.post("/api/admin/banners", { title: "Audit Test", imageUrl: "/audit.jpg" });
    expect(created.status).toBe(201);
    await admin.patch(`/api/admin/banners/${created.body.id}`, { subtitle: "secret body text" });

    const rows = await waitFor(async () => {
      const r = await db.adminAuditLog.findMany({
        where: { OR: [{ method: "POST", path: "/api/admin/banners" }, { path: `/api/admin/banners/${created.body.id}` }] },
        orderBy: { id: "asc" },
      });
      return r.length >= 2 ? r : null;
    });
    expect(rows).toHaveLength(2);
    expect(await db.adminAuditLog.count({ where: { method: "GET" } })).toBe(0);
    expect(rows[0]).toMatchObject({ adminId, method: "POST", path: "/api/admin/banners", status: 201, targetId: null });
    expect(rows[1]).toMatchObject({ adminId, method: "PATCH", path: `/api/admin/banners/${created.body.id}`, status: 200, targetId: String(created.body.id) });
    expect(JSON.stringify(rows)).not.toContain("secret body text");

    const failed = await admin.delete("/api/admin/banners/99999999");
    expect(failed.status).toBe(404);
    const row = await waitFor(() => db.adminAuditLog.findFirst({ where: { method: "DELETE", path: "/api/admin/banners/99999999" } }));
    expect(row).toMatchObject({ status: 404, targetId: "99999999" });

    const list = await admin.get("/api/admin/audit-log");
    expect(list.body.items[0]).toMatchObject({ method: "DELETE", admin: { id: adminId } });
    expect((await admin.get(`/api/admin/audit-log?adminId=${adminId}`)).body.meta.total).toBe(3);
    expectError(await admin.get("/api/admin/audit-log?from=2026-02-01&to=2026-01-01"), 400, "VALIDATION_ERROR");
  });
});
