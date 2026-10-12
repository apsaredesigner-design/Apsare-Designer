import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { createCategory, createProduct, createUser, createVariant } from "./helpers/factories";
import { api, expectError, loginWith, type Api } from "./helpers/http";

let me: Api;
let myId: number;

beforeEach(async () => {
  const user = await createUser();
  myId = user.id;
  me = api(await loginWith(user.email, user.password));
});

const add = (variantId: number, quantity?: number) => me.post("/api/cart", quantity === undefined ? { variantId } : { variantId, quantity });

describe("cart: bodies are integers only", () => {
  it.each([
    ["numeric string id", { variantId: "1" }],
    ["boolean quantity", { variantId: 1, quantity: true }],
    ["decimal quantity", { variantId: 1, quantity: 1.5 }],
    ["zero quantity", { variantId: 1, quantity: 0 }],
    ["negative id", { variantId: -1 }],
    ["over the line max", { variantId: 1, quantity: 11 }],
    ["numeric string quantity", { variantId: 1, quantity: "2" }],
  ])("%s → 400", async (_label, body) => {
    expectError(await me.post("/api/cart", body), 400, "VALIDATION_ERROR");
  });

  it("PATCH and merge validate too", async () => {
    expectError(await me.patch("/api/cart/1", { quantity: "3" }), 400, "VALIDATION_ERROR");
    expectError(await me.post("/api/cart/merge", { items: [{ variantId: 1, quantity: 101 }] }), 400, "VALIDATION_ERROR");
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ variantId: i + 1, quantity: 1 }));
    expectError(await me.post("/api/cart/merge", { items: tooMany }), 400, "VALIDATION_ERROR");
    expectError(await me.post("/api/wishlist", { productId: "1" }), 400, "VALIDATION_ERROR");
  });
});

describe("cart: caps", () => {
  it("caps a line at stock and reports it", async () => {
    const p = await createProduct({ variants: [{ stock: 3 }] });
    const res = await add(p.variants[0].id, 5);
    expect(res.status).toBe(201);
    expect(res.body.added).toEqual({ variantId: p.variants[0].id, quantity: 3, capped: true, requested: 5 });
    expect(res.body.notice).toMatch(/limited to 3/);
    const again = await add(p.variants[0].id, 2);
    expect(again.body.added).toMatchObject({ quantity: 3, capped: true, requested: 5 });
    expect(again.body.items[0]).toMatchObject({ quantity: 3, maxQuantity: 3, available: true, issue: null });
  });

  it("caps a line at 10 even with plenty of stock, merging repeated adds", async () => {
    const p = await createProduct({ variants: [{ stock: 50 }] });
    expect((await add(p.variants[0].id, 8)).body.added).toMatchObject({ quantity: 8, capped: false });
    const res = await add(p.variants[0].id, 8);
    expect(res.body.added).toMatchObject({ quantity: 10, capped: true, requested: 16 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.itemCount).toBe(10);
  });

  it("PATCH caps at stock; out of stock is 409", async () => {
    const p = await createProduct({ variants: [{ stock: 4 }] });
    const line = (await add(p.variants[0].id, 1)).body.items[0];
    const res = await me.patch(`/api/cart/${line.id}`, { quantity: 9 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(4);
    expect(res.body.notice).not.toBeNull();
    await db.productVariant.update({ where: { id: p.variants[0].id }, data: { stock: 0 } });
    expectError(await me.patch(`/api/cart/${line.id}`, { quantity: 1 }), 409, "OUT_OF_STOCK");
  });

  it("adding an out-of-stock variant is 409, an unknown one 404", async () => {
    const p = await createProduct({ variants: [{ stock: 0 }] });
    expectError(await add(p.variants[0].id), 409, "OUT_OF_STOCK");
    expectError(await add(99999999), 404, "NOT_FOUND");
  });
});

describe("cart: stock changes and availability", () => {
  it("clamps a line whose stock fell below its quantity, once, in adjustments", async () => {
    const p = await createProduct({ variants: [{ stock: 10 }] });
    const line = (await add(p.variants[0].id, 5)).body.items[0];
    await db.productVariant.update({ where: { id: p.variants[0].id }, data: { stock: 2 } });

    const first = await me.get("/api/cart");
    expect(first.body.adjustments).toEqual([{ itemId: line.id, variantId: p.variants[0].id, from: 5, to: 2 }]);
    expect(first.body.items[0]).toMatchObject({ quantity: 2, available: true });
    expect((await db.cartItem.findUniqueOrThrow({ where: { id: line.id } })).quantity).toBe(2);
    expect((await me.get("/api/cart")).body.adjustments).toEqual([]);
  });

  it("keeps a stock-0 line flagged OUT_OF_STOCK without changing it", async () => {
    const p = await createProduct({ variants: [{ stock: 10 }] });
    await add(p.variants[0].id, 3);
    await db.productVariant.update({ where: { id: p.variants[0].id }, data: { stock: 0 } });
    const res = await me.get("/api/cart");
    expect(res.body.adjustments).toEqual([]);
    expect(res.body.items[0]).toMatchObject({ quantity: 3, available: false, issue: "OUT_OF_STOCK", maxQuantity: 0 });
    expect(res.body.hasUnavailableItems).toBe(true);
    expect(res.body.summary.subtotal).toBe(0);
  });

  it("flags an inactive product or hidden category as INACTIVE and leaves it out of the summary", async () => {
    const ok = await createProduct({ mrp: 1000, salePrice: 800 });
    const deact = await createProduct();
    const cat = await createCategory();
    const hiddenCat = await createProduct({ categoryId: cat.id });
    for (const p of [ok, deact, hiddenCat]) await add(p.variants[0].id, 1);
    await db.product.update({ where: { id: deact.id }, data: { isActive: false } });
    await db.category.update({ where: { id: cat.id }, data: { isActive: false } });

    const res = await me.get("/api/cart");
    const byVariant = new Map(res.body.items.map((i: { variant: { id: number } }) => [i.variant.id, i]));
    expect(byVariant.get(deact.variants[0].id)).toMatchObject({ issue: "INACTIVE", available: false });
    expect(byVariant.get(hiddenCat.variants[0].id)).toMatchObject({ issue: "INACTIVE", available: false });
    expect(byVariant.get(ok.variants[0].id)).toMatchObject({ issue: null, available: true });
    expect(res.body.summary.subtotal).toBe(800);
    expect(res.body.hasUnavailableItems).toBe(true);
    // A hidden product cannot be added either.
    expectError(await add(deact.variants[0].id), 404, "NOT_FOUND");
  });
});

describe("cart: merge", () => {
  it("sums duplicates, caps them and reports skipped variants", async () => {
    const big = await createProduct({ variants: [{ stock: 50 }] });
    const small = await createProduct({ variants: [{ stock: 2 }] });
    const none = await createProduct({ variants: [{ stock: 0 }] });
    const hidden = await createProduct({ isActive: false });
    const res = await me.post("/api/cart/merge", {
      items: [
        { variantId: big.variants[0].id, quantity: 7 },
        { variantId: big.variants[0].id, quantity: 7 },
        { variantId: small.variants[0].id, quantity: 5 },
        { variantId: none.variants[0].id, quantity: 1 },
        { variantId: hidden.variants[0].id, quantity: 1 },
        { variantId: 99999999, quantity: 1 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.merged).toEqual(
      expect.arrayContaining([
        { variantId: big.variants[0].id, quantity: 10, capped: true },
        { variantId: small.variants[0].id, quantity: 2, capped: true },
      ]),
    );
    expect(res.body.skipped).toEqual(
      expect.arrayContaining([
        { variantId: none.variants[0].id, reason: "OUT_OF_STOCK" },
        { variantId: hidden.variants[0].id, reason: "NOT_FOUND" },
        { variantId: 99999999, reason: "NOT_FOUND" },
      ]),
    );
    expect(res.body.items).toHaveLength(2);
  });

  it("accepts exactly 50 entries", async () => {
    const p = await createProduct({ variants: [{ stock: 50 }] });
    const items = Array.from({ length: 50 }, () => ({ variantId: p.variants[0].id, quantity: 1 }));
    const res = await me.post("/api/cart/merge", { items });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(10);
  });
});

describe("cart: ownership and caching", () => {
  it("another user's cart line is a 404 for every mutation", async () => {
    const other = await createUser();
    const p = await createProduct();
    const theirs = await db.cartItem.create({ data: { userId: other.id, variantId: p.variants[0].id, quantity: 1 } });
    expectError(await me.patch(`/api/cart/${theirs.id}`, { quantity: 2 }), 404, "NOT_FOUND");
    expectError(await me.delete(`/api/cart/${theirs.id}`), 404, "NOT_FOUND");
    expectError(await me.post(`/api/cart/${theirs.id}/move-to-wishlist`), 404, "NOT_FOUND");
    expect(await db.cartItem.findUniqueOrThrow({ where: { id: theirs.id } })).toMatchObject({ quantity: 1 });
    expect((await me.get("/api/cart")).body.items).toEqual([]);
  });

  it("sends Cache-Control: private, no-store on cart and wishlist", async () => {
    const p = await createProduct();
    for (const res of [await me.get("/api/cart"), await add(p.variants[0].id), await me.get("/api/wishlist"), await me.post("/api/wishlist", { productId: p.id })]) {
      expect(res.headers["cache-control"]).toBe("private, no-store");
    }
  });

  it("needs a session", async () => {
    expectError(await api().get("/api/cart"), 401, "UNAUTHENTICATED");
    expectError(await api().get("/api/wishlist"), 401, "UNAUTHENTICATED");
  });
});

describe("wishlist", () => {
  it("adds idempotently (201 then 200), removes idempotently and hides unpurchasable products", async () => {
    const p = await createProduct();
    expect((await me.post("/api/wishlist", { productId: p.id })).status).toBe(201);
    const again = await me.post("/api/wishlist", { productId: p.id });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ productId: p.id, inWishlist: true, added: false });
    expect((await me.get("/api/wishlist")).body.meta.total).toBe(1);

    await db.product.update({ where: { id: p.id }, data: { isActive: false } });
    expect((await me.get("/api/wishlist")).body.meta.total).toBe(0);
    expectError(await me.post("/api/wishlist", { productId: p.id }), 404, "NOT_FOUND");
    await db.product.update({ where: { id: p.id }, data: { isActive: true } });
    expect((await me.get("/api/wishlist")).body.meta.total).toBe(1);

    expect((await me.delete(`/api/wishlist/${p.id}`)).body).toEqual({ productId: p.id, inWishlist: false, removed: true });
    expect((await me.delete(`/api/wishlist/${p.id}`)).body).toEqual({ productId: p.id, inWishlist: false, removed: false });
  });

  it("move-to-cart checks the variant belongs to the product and follows cart caps", async () => {
    const p = await createProduct({ variants: [{ stock: 2 }] });
    const other = await createProduct();
    expectError(await me.post(`/api/wishlist/${p.id}/move-to-cart`, { variantId: p.variants[0].id }), 404, "NOT_FOUND");
    await me.post("/api/wishlist", { productId: p.id });
    expectError(await me.post(`/api/wishlist/${p.id}/move-to-cart`, { variantId: other.variants[0].id }), 400, "VARIANT_MISMATCH");
    const res = await me.post(`/api/wishlist/${p.id}/move-to-cart`, { variantId: p.variants[0].id, quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.cartItem).toMatchObject({ quantity: 2, capped: true });
    expect(await db.wishlistItem.count({ where: { userId: myId } })).toBe(0);
  });

  it("move-to-wishlist moves a cart line", async () => {
    const p = await createProduct();
    await createVariant(p.id, { size: "L" });
    const line = (await add(p.variants[0].id)).body.items[0];
    const res = await me.post(`/api/cart/${line.id}/move-to-wishlist`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(await db.wishlistItem.count({ where: { userId: myId, productId: p.id } })).toBe(1);
  });
});
