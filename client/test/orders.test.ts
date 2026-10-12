import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { checkout, fillCart, placeOrder, shopper } from "./helpers/checkout";
import { createAddress, createCoupon, createProduct, stockOf } from "./helpers/factories";
import { expectError } from "./helpers/http";

const soldCount = async (productId: number) => (await db.product.findUniqueOrThrow({ where: { id: productId } })).soldCount;

describe("placing a COD order", () => {
  it("prices from the DB, snapshots the address and items, reserves stock and empties the cart", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ mrp: 2000, salePrice: 1500, soldCount: 7, variants: [{ size: "M", color: "Maroon", stock: 10 }] });
    const q = await createProduct({ mrp: 1000, salePrice: 999.5, variants: [{ size: "L", color: "Teal", stock: 3 }] });
    const coupon = await createCoupon({ type: "FLAT", value: 200 });
    const address = await createAddress(user.id, { pincode: "560001" });

    await fillCart(api, [{ variantId: p.variants[0].id, quantity: 2 }, { variantId: q.variants[0].id, quantity: 1 }]);
    const res = await placeOrder(api, user.id, { addressId: address.id, couponCode: coupon.code.toLowerCase() });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const o = res.body;

    expect(o.orderNumber).toMatch(/^APS-\d{6}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
    expect(o).toMatchObject({
      status: "PLACED", paymentMethod: "COD", paymentStatus: "PENDING",
      totalMrp: 5000, totalDiscount: 1000.5, couponDiscount: 200, deliveryCharge: 0, finalAmount: 3799.5,
      shipName: address.fullName, shipLine1: address.line1, shipCity: address.city, shipPincode: "560001",
      coupon: { code: coupon.code },
    });
    expect(o.idempotencyKey).toBeUndefined();
    expect(o.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variantId: p.variants[0].id, productName: p.name, productCode: p.code, size: "M", color: "Maroon", mrp: 2000, salePrice: 1500, quantity: 2, imageUrl: expect.stringMatching(/^\/images\//) }),
        expect.objectContaining({ variantId: q.variants[0].id, salePrice: 999.5, quantity: 1 }),
      ]),
    );
    expect(o.statusHistory.map((h: { status: string }) => h.status)).toEqual(["PLACED"]);
    expect(o.payments).toEqual([expect.objectContaining({ provider: "cod", amount: 3799.5, status: "PENDING" })]);

    expect(await stockOf(p.variants[0].id)).toBe(8);
    expect(await stockOf(q.variants[0].id)).toBe(2);
    expect(await soldCount(p.id)).toBe(9);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
    expect((await api.get("/api/cart")).body.items).toEqual([]);

    // Snapshots survive later edits to the product and the address.
    await db.product.update({ where: { id: p.id }, data: { name: "Renamed", salePrice: 1 } });
    await api.delete(`/api/addresses/${address.id}`);
    const detail = await api.get(`/api/orders/${o.orderNumber.toLowerCase()}`);
    expect(detail.status).toBe(200);
    expect(detail.body.items.find((i: { variantId: number }) => i.variantId === p.variants[0].id)).toMatchObject({ productName: p.name, salePrice: 1500 });
    expect(detail.body.shipLine1).toBe(address.line1);

    const list = await api.get("/api/orders");
    expect(list.body.items[0]).toMatchObject({ orderNumber: o.orderNumber, itemCount: 3 });
  });

  it("adds the delivery charge below the free-shipping threshold", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ mrp: 1000, salePrice: 800 });
    const o = await checkout(api, user.id, [{ variantId: p.variants[0].id }]);
    expect(o).toMatchObject({ totalMrp: 1000, totalDiscount: 200, deliveryCharge: 99, finalAmount: 899 });
  });

  it("another user's order is a 404", async () => {
    const a = await shopper();
    const b = await shopper();
    const p = await createProduct();
    const o = await checkout(a.api, a.user.id, [{ variantId: p.variants[0].id }]);
    expectError(await b.api.get(`/api/orders/${o.orderNumber}`), 404, "NOT_FOUND");
    expectError(await b.api.post(`/api/orders/${o.orderNumber}/cancel`, {}), 404, "NOT_FOUND");
  });
});

describe("order failures leave nothing behind", () => {
  it("out of stock → 409 with a detail per short line; no stock, coupon, cart or order change", async () => {
    const { api, user } = await shopper();
    const fine = await createProduct({ variants: [{ stock: 5 }] });
    const short = await createProduct({ variants: [{ stock: 5 }] });
    const coupon = await createCoupon();
    await fillCart(api, [{ variantId: fine.variants[0].id, quantity: 2 }, { variantId: short.variants[0].id, quantity: 3 }]);
    await db.productVariant.update({ where: { id: short.variants[0].id }, data: { stock: 1 } });

    const res = await placeOrder(api, user.id, { couponCode: coupon.code });
    const err = expectError(res, 409, "OUT_OF_STOCK");
    expect(err.details).toEqual([{ path: `variant.${short.variants[0].id}`, message: expect.stringMatching(/only 1 left$/) }]);

    expect(await stockOf(fine.variants[0].id)).toBe(5);
    expect(await stockOf(short.variants[0].id)).toBe(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);
    expect(await db.order.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.cartItem.count({ where: { userId: user.id } })).toBe(2);
    expect(await soldCount(fine.id)).toBe(0);
  });

  it("an inactive product or hidden category → 409 PRODUCT_UNAVAILABLE, nothing reserved", async () => {
    const { api, user } = await shopper();
    const ok = await createProduct({ variants: [{ stock: 5 }] });
    const gone = await createProduct({ variants: [{ size: "S", color: "Red", stock: 5 }] });
    await fillCart(api, [{ variantId: ok.variants[0].id }, { variantId: gone.variants[0].id }]);
    await db.product.update({ where: { id: gone.id }, data: { isActive: false } });

    const err = expectError(await placeOrder(api, user.id), 409, "PRODUCT_UNAVAILABLE");
    expect(err.details).toEqual([{ path: `variant.${gone.variants[0].id}`, message: `${gone.name} (S, Red) is no longer available` }]);
    expect(await stockOf(ok.variants[0].id)).toBe(5);
    expect(await db.order.count({ where: { userId: user.id } })).toBe(0);
  });

  it("a non-serviceable pincode and a COD-disallowed pincode are 400s", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ variants: [{ stock: 5 }] });
    await fillCart(api, [{ variantId: p.variants[0].id }]);
    expectError(await placeOrder(api, user.id, { pincode: "999999" }), 400, "PINCODE_NOT_SERVICEABLE");
    expectError(await placeOrder(api, user.id, { pincode: "791001" }), 400, "COD_NOT_AVAILABLE");
    expectError(await placeOrder(api, user.id, { paymentMethod: "UPI" }), 400, "PAYMENT_METHOD_UNAVAILABLE");
    expect(await stockOf(p.variants[0].id)).toBe(5);
    expect(await db.order.count({ where: { userId: user.id } })).toBe(0);
  });

  it("an empty cart, someone else's address and bad bodies are refused", async () => {
    const { api, user } = await shopper();
    const other = await shopper();
    expectError(await placeOrder(api, user.id), 400, "CART_EMPTY");
    const p = await createProduct();
    await fillCart(api, [{ variantId: p.variants[0].id }]);
    const theirs = await createAddress(other.user.id);
    expectError(await placeOrder(api, user.id, { addressId: theirs.id }), 404, "NOT_FOUND");
    expectError(await api.post("/api/orders", { addressId: "1", paymentMethod: "COD" }), 400, "VALIDATION_ERROR");
    expectError(await api.post("/api/orders", { addressId: theirs.id, paymentMethod: "BITCOIN" }), 400, "VALIDATION_ERROR");
  });
});

describe("idempotency", () => {
  it("a replay with the same key returns the same order (200, replayed) and places nothing new", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ variants: [{ stock: 10 }] });
    const address = await createAddress(user.id);
    const key = randomUUID();
    await fillCart(api, [{ variantId: p.variants[0].id, quantity: 2 }]);

    const first = await placeOrder(api, user.id, { addressId: address.id, idempotencyKey: key });
    expect(first.status).toBe(201);
    expect(first.body.replayed).toBe(false);
    const replay = await placeOrder(api, user.id, { addressId: address.id, idempotencyKey: key });
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ orderNumber: first.body.orderNumber, replayed: true });
    expect(await db.order.count({ where: { userId: user.id } })).toBe(1);
    expect(await stockOf(p.variants[0].id)).toBe(8);

    // Without the key, the emptied cart makes a double submit fail.
    expectError(await placeOrder(api, user.id, { addressId: address.id }), 400, "CART_EMPTY");
    // Another user with the same key is unrelated.
    const other = await shopper();
    await fillCart(other.api, [{ variantId: p.variants[0].id }]);
    const theirs = await placeOrder(other.api, other.user.id, { idempotencyKey: key });
    expect(theirs.status).toBe(201);
    expect(theirs.body.orderNumber).not.toBe(first.body.orderNumber);
  });

  it("concurrent requests with one key produce exactly one order", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ variants: [{ stock: 10 }] });
    const address = await createAddress(user.id);
    await fillCart(api, [{ variantId: p.variants[0].id }]);
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () => placeOrder(api, user.id, { addressId: address.id, idempotencyKey: key })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 200, 201]);
    expect(new Set(results.map((r) => r.body.orderNumber)).size).toBe(1);
    expect(await db.order.count({ where: { userId: user.id } })).toBe(1);
  });

  it("rejects keys shorter than 8 or longer than 128 characters", async () => {
    const { api, user } = await shopper();
    expectError(await placeOrder(api, user.id, { idempotencyKey: "short" }), 400, "VALIDATION_ERROR");
    expectError(await placeOrder(api, user.id, { idempotencyKey: "k".repeat(129) }), 400, "VALIDATION_ERROR");
  });
});

describe("concurrency", () => {
  it("parallel orders for the last unit: exactly one succeeds, the rest get 409 OUT_OF_STOCK", async () => {
    const p = await createProduct({ variants: [{ stock: 1 }] });
    const buyers = await Promise.all(Array.from({ length: 5 }, () => shopper()));
    for (const b of buyers) await fillCart(b.api, [{ variantId: p.variants[0].id }]);
    const addresses = await Promise.all(buyers.map((b) => createAddress(b.user.id)));

    const results = await Promise.all(buyers.map((b, i) => placeOrder(b.api, b.user.id, { addressId: addresses[i].id })));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    for (const r of results.filter((r) => r.status === 409)) expectError(r, 409, "OUT_OF_STOCK");
    expect(await stockOf(p.variants[0].id)).toBe(0);
    expect(await db.orderItem.count({ where: { variantId: p.variants[0].id } })).toBe(1);
    expect(await soldCount(p.id)).toBe(1);
  });
});

describe("coupon usage limit under concurrency", () => {
  it("the last use of a coupon goes to exactly one of several parallel orders", async () => {
    const p = await createProduct({ variants: [{ stock: 20 }] });
    const coupon = await createCoupon({ usageLimit: 1 });
    const buyers = await Promise.all(Array.from({ length: 4 }, () => shopper()));
    for (const b of buyers) await fillCart(b.api, [{ variantId: p.variants[0].id }]);
    const addresses = await Promise.all(buyers.map((b) => createAddress(b.user.id)));

    const results = await Promise.all(buyers.map((b, i) => placeOrder(b.api, b.user.id, { addressId: addresses[i].id, couponCode: coupon.code })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 400, 400, 400]);
    for (const r of results.filter((r) => r.status === 400)) expectError(r, 400, "COUPON_INVALID");
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
    expect(await stockOf(p.variants[0].id)).toBe(19); // the refused orders reserved nothing
  });
});

describe("cancelling", () => {
  it("restores stock, soldCount and the coupon use; payment fails; a second cancel is 409", async () => {
    const { api, user } = await shopper();
    const p = await createProduct({ soldCount: 4, variants: [{ stock: 6 }] });
    const coupon = await createCoupon({ usageLimit: 5 });
    const o = await checkout(api, user.id, [{ variantId: p.variants[0].id, quantity: 3 }], { couponCode: coupon.code });
    expect(await stockOf(p.variants[0].id)).toBe(3);
    expect(await soldCount(p.id)).toBe(7);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);

    const res = await api.post(`/api/orders/${o.orderNumber}/cancel`, { reason: "Changed my mind" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "CANCELLED", paymentStatus: "FAILED" });
    expect(res.body.payments[0].status).toBe("FAILED");
    expect(res.body.statusHistory.at(-1)).toMatchObject({ status: "CANCELLED", note: "Cancelled by customer: Changed my mind" });
    expect(await stockOf(p.variants[0].id)).toBe(6);
    expect(await soldCount(p.id)).toBe(4);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);

    expectError(await api.post(`/api/orders/${o.orderNumber}/cancel`, {}), 409, "ORDER_NOT_CANCELLABLE");
    expect(await stockOf(p.variants[0].id)).toBe(6);
  });

  it("cannot cancel once shipped", async () => {
    const { api, user } = await shopper();
    const p = await createProduct();
    const o = await checkout(api, user.id, [{ variantId: p.variants[0].id }]);
    await db.order.update({ where: { orderNumber: o.orderNumber }, data: { status: "SHIPPED" } });
    expectError(await api.post(`/api/orders/${o.orderNumber}/cancel`, {}), 409, "ORDER_NOT_CANCELLABLE");
  });
});
