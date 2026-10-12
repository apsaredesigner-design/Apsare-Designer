// Not ported from the removed Express suite (Express had no payments/coupons-available suite beyond
// errors.test.ts): pins the Phase 3/4 contract that the ported suites don't cover,
// including the router-level middleware Express ran before its 404 on these paths.
import { describe, expect, it } from "vitest";
import { checkout, fillCart, shopper } from "./helpers/checkout";
import { createCoupon, createProduct } from "./helpers/factories";
import { api, expectError } from "./helpers/http";

describe("payments", () => {
  it("pincode check: serviceable, COD-disallowed, unknown and malformed", async () => {
    const ok = await api().get("/api/payments/pincode/560001");
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ pincode: "560001", serviceable: true, codAvailable: true, deliveryDays: 2 });
    expect(ok.body.estimatedDelivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((await api().get("/api/payments/pincode/791001")).body).toMatchObject({ serviceable: true, codAvailable: false });
    expect((await api().get("/api/payments/pincode/999999")).body).toEqual({
      pincode: "999999", serviceable: false, codAvailable: false, deliveryDays: null, estimatedDelivery: null,
    });
    const bad = expectError(await api().get("/api/payments/pincode/012345"), 400, "VALIDATION_ERROR");
    expect(bad.details![0].path).toBe("params.pincode");
  });

  it("methods: cod only under PAYMENT_PROVIDER=cod", async () => {
    const res = await api().get("/api/payments/methods");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ provider: "cod", methods: ["COD"] });
  });

  it("verify needs a session and is 501 for cod", async () => {
    expectError(await api().post("/api/payments/verify", { orderNumber: "APS-000000-AAAAA", payload: {} }), 401, "UNAUTHENTICATED");
    const { api: me } = await shopper();
    expectError(await me.post("/api/payments/verify", { orderNumber: "APS-000000-AAAAA", payload: {} }), 501, "NOT_IMPLEMENTED");
    expectError(await me.post("/api/payments/verify", {}), 400, "VALIDATION_ERROR");
  });
});

describe("coupons/available", () => {
  it("guests get the public list; shoppers get eligibility against their cart; always no-store", async () => {
    const c = await createCoupon({ value: 100 });

    const guest = await api().get("/api/coupons/available");
    expect(guest.status).toBe(200);
    expect(guest.headers["cache-control"]).toBe("private, no-store");
    expect(guest.body.subtotal).toBeNull();
    const pub = guest.body.items.find((i: { code: string }) => i.code === c.code);
    expect(pub).toBeDefined();
    expect(pub.eligible).toBeUndefined();

    const { api: me } = await shopper();
    const p = await createProduct({ mrp: 2000, salePrice: 1500 });
    await fillCart(me, [{ variantId: p.variants[0].id }]);
    const mine = await me.get("/api/coupons/available");
    expect(mine.body.subtotal).toBe(1500);
    expect(mine.body.items.find((i: { code: string }) => i.code === c.code)).toMatchObject({ eligible: true, amountNeeded: 0, discount: 100 });
  });

  it("apply needs a session", async () => {
    expectError(await api().post("/api/coupons/apply", { code: "FLAT500" }), 401, "UNAUTHENTICATED");
  });
});

describe("order list and detail", () => {
  it("lists my orders with a status filter; detail validates the order number", async () => {
    const { api: me, user } = await shopper();
    const p = await createProduct({ variants: [{ stock: 5 }] });
    const o = await checkout(me, user.id, [{ variantId: p.variants[0].id }]);
    expect((await me.get("/api/orders?status=PLACED")).body.items.map((i: { orderNumber: string }) => i.orderNumber)).toEqual([o.orderNumber]);
    expect((await me.get("/api/orders?status=DELIVERED")).body.items).toEqual([]);
    expectError(await me.get("/api/orders?status=NOPE"), 400, "VALIDATION_ERROR");
    expectError(await me.get(`/api/orders/${"A".repeat(33)}`), 400, "VALIDATION_ERROR");
  });
});

describe("router-level middleware before the 404 (Express parity)", () => {
  it("an unimplemented method is 401 for a guest and 404 for a shopper", async () => {
    const { api: me } = await shopper();
    for (const [method, path] of [
      ["put", "/api/cart"],
      ["get", "/api/cart/merge"],
      ["get", "/api/cart/1"],
      ["put", "/api/wishlist"],
      ["get", "/api/wishlist/1/move-to-cart"],
      ["delete", "/api/orders"],
      ["get", "/api/orders/APS-000000-AAAAA/cancel"],
      ["get", "/api/payments/verify"],
      ["post", "/api/payments/methods"],
      ["get", "/api/payments"],
      ["get", "/api/users/me"],
      ["delete", "/api/users/me/profile"],
      ["get", "/api/users/nope"],
      ["put", "/api/addresses"],
      ["get", "/api/addresses/1"],
      ["get", "/api/addresses/1/nope"],
      ["get", "/api/cart/1/nope"],
      ["get", "/api/wishlist/1/nope"],
      ["get", "/api/orders/APS-000000-AAAAA/nope"],
    ] as const) {
      expectError(await api()[method](path), 401, "UNAUTHENTICATED");
      expectError(await me[method](path), 404, "NOT_FOUND");
    }
    // cart and wishlist also sent no-store before the 404.
    expect((await me.put("/api/cart")).headers["cache-control"]).toBe("private, no-store");
    expect((await me.get("/api/wishlist/1/nope")).headers["cache-control"]).toBe("private, no-store");
    // cart/merge is a static twin: other methods fall through to /:itemId, as in Express.
    expect(expectError(await me.patch("/api/cart/merge", { quantity: 1 }), 400, "VALIDATION_ERROR").details![0].path).toBe("params.itemId");
    // coupons had no router-level middleware: a plain 404.
    expectError(await api().put("/api/coupons/apply"), 404, "NOT_FOUND");
  });
});
