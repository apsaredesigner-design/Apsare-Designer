import { describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { createCoupon, createProduct } from "./helpers/factories";
import { checkout, fillCart, shopper } from "./helpers/checkout";
import { expectError } from "./helpers/http";

const INVALID = "Invalid or expired coupon";
const day = 86_400_000;

/** A shopper whose cart holds one line worth `salePrice` (MRP 2000 by default). */
async function withCart(salePrice = 1500) {
  const s = await shopper();
  const p = await createProduct({ mrp: Math.max(2000, salePrice), salePrice, variants: [{ stock: 50 }] });
  await fillCart(s.api, [{ variantId: p.variants[0].id }]);
  return { ...s, product: p };
}

describe("coupons: generic invalid message", () => {
  it("unknown, inactive, expired and not-yet-started codes all get the same 400", async () => {
    const { api } = await withCart();
    const inactive = await createCoupon({ isActive: false });
    const expired = await createCoupon({ expiresAt: new Date(Date.now() - day) });
    const future = await createCoupon({ startsAt: new Date(Date.now() + day) });
    const bodies = [];
    for (const code of ["NOSUCHCODE", inactive.code, expired.code, future.code, "EXPIRED15"]) {
      const res = await api.post("/api/coupons/apply", { code });
      const err = expectError(res, 400, "COUPON_INVALID");
      expect(err.message, code).toBe(INVALID);
      bodies.push(res.body);
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
  });

  it("GET /cart?coupon= never fails: coupon null with couponError", async () => {
    const { api } = await withCart();
    const res = await api.get("/api/cart?coupon=NOSUCHCODE");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ coupon: null, couponError: INVALID });
  });

  it("codes are trimmed and case-insensitive", async () => {
    const { api } = await withCart();
    const c = await createCoupon({ value: 100 });
    const res = await api.post("/api/coupons/apply", { code: `  ${c.code.toLowerCase()} ` });
    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(100);
  });

  it("an empty bag cannot apply a coupon", async () => {
    const { api } = await shopper();
    const res = await api.post("/api/coupons/apply", { code: "FLAT500" });
    expect(expectError(res, 400, "COUPON_INVALID").message).toMatch(/empty/i);
  });
});

describe("coupons: rules", () => {
  it("enforces the minimum order on the server-side subtotal (client subtotal ignored)", async () => {
    const { api } = await withCart(1500);
    const c = await createCoupon({ minOrderAmount: 5000 });
    const res = await api.post("/api/coupons/apply", { code: c.code, subtotal: 999999 });
    expect(expectError(res, 400, "COUPON_INVALID").message).toMatch(/Add items worth ₹3,500 more/);
  });

  it("firstOrderOnly: refused once the customer has an order, allowed again after cancelling it", async () => {
    const { api, user } = await withCart(1500);
    const c = await createCoupon({ firstOrderOnly: true });
    expect((await api.post("/api/coupons/apply", { code: c.code })).status).toBe(200);

    const p = await createProduct({ variants: [{ stock: 5 }] });
    const order = await checkout(api, user.id, [{ variantId: p.variants[0].id }]);
    await fillCart(api, [{ variantId: p.variants[0].id }]);
    const res = await api.post("/api/coupons/apply", { code: c.code });
    expect(expectError(res, 400, "COUPON_INVALID").message).toBe(`Coupon ${c.code} is only valid on your first order`);

    expect((await api.post(`/api/orders/${order.orderNumber}/cancel`, {})).status).toBe(200);
    expect((await api.post("/api/coupons/apply", { code: c.code })).status).toBe(200);
  });

  it("perUserLimit counts the customer's non-cancelled orders with the coupon", async () => {
    const { api, user, product } = await withCart(1500);
    const c = await createCoupon({ perUserLimit: 1 });
    await checkout(api, user.id, [], { couponCode: c.code });
    await fillCart(api, [{ variantId: product.variants[0].id }]);
    const res = await api.post("/api/coupons/apply", { code: c.code });
    expect(expectError(res, 400, "COUPON_INVALID").message).toBe(`You have already used coupon ${c.code} the maximum number of times`);

    // Another customer is unaffected.
    const other = await withCart(1500);
    expect((await other.api.post("/api/coupons/apply", { code: c.code })).status).toBe(200);
  });

  it("a used-up usageLimit is refused", async () => {
    const { api } = await withCart();
    const c = await createCoupon({ usageLimit: 1 });
    await db.coupon.update({ where: { id: c.id }, data: { usedCount: 1 } });
    expect(expectError(await api.post("/api/coupons/apply", { code: c.code }), 400, "COUPON_INVALID").message).toMatch(/usage limit/);
  });
});

describe("coupons: maths", () => {
  it("a FLAT discount larger than the subtotal is capped at the subtotal", async () => {
    const { api } = await withCart(1500);
    const c = await createCoupon({ type: "FLAT", value: 100000 });
    const res = await api.post("/api/coupons/apply", { code: c.code });
    expect(res.status).toBe(200);
    expect(res.body.discount).toBe(1500);
    expect(res.body.summary).toMatchObject({ subtotal: 1500, couponDiscount: 1500, deliveryCharge: 99, total: 99 });
    const cart = await api.get(`/api/cart?coupon=${c.code}`);
    expect(cart.body.summary.couponDiscount).toBeLessThanOrEqual(cart.body.summary.subtotal);
    expect(cart.body.summary.total).toBeGreaterThanOrEqual(0);
  });

  it("a PERCENT discount floors to the paisa and respects maxDiscount", async () => {
    const { api } = await withCart(1499.99);
    const pct = await createCoupon({ type: "PERCENT", value: 15 });
    expect((await api.post("/api/coupons/apply", { code: pct.code })).body.discount).toBe(224.99); // 224.9985 floored
    const capped = await createCoupon({ type: "PERCENT", value: 50, maxDiscount: 300 });
    expect((await api.post("/api/coupons/apply", { code: capped.code })).body.discount).toBe(300);
  });

  it("an order never has a coupon discount above its subtotal", async () => {
    const { api, user } = await withCart(1500);
    const c = await createCoupon({ type: "FLAT", value: 100000 });
    const order = await checkout(api, user.id, [], { couponCode: c.code });
    expect(order).toMatchObject({ couponDiscount: 1500, finalAmount: 99 });
  });
});
