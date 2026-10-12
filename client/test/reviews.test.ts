// Port of the "reviews (verified purchase)" test in the removed Express suite's test/admin-ops.test.ts
// (same assertions): the order goes through /api/cart + /api/orders and is delivered
// through PATCH /api/admin/orders/:orderNumber/status, as in the source.
import { beforeAll, describe, expect, it } from "vitest";
import { checkout, shopper } from "./helpers/checkout";
import { db } from "./helpers/db";
import { createProduct } from "./helpers/factories";
import { api, expectError, loginAs, type Api } from "./helpers/http";

let admin: Api;
beforeAll(async () => {
  admin = api(await loginAs("admin"));
});

describe("reviews (verified purchase)", () => {
  it("needs a delivered order, allows one review per product and recomputes the rating", async () => {
    const { api: customer, user } = await shopper();
    const product = await createProduct();
    const order = await checkout(customer, user.id, [{ variantId: product.variants[0].id, quantity: 2 }]);
    const post = (body: object) => customer.post(`/api/products/${product.slug}/reviews`, body);
    expectError(await post({ rating: 5 }), 403, "PURCHASE_REQUIRED");
    for (const status of ["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      expect((await admin.patch(`/api/admin/orders/${order.orderNumber}/status`, { status })).status).toBe(200);
    }
    expectError(await post({ rating: 6 }), 400, "VALIDATION_ERROR");
    expectError(await post({ rating: 4.5 }), 400, "VALIDATION_ERROR");
    const res = await post({ rating: 4, comment: "  Lovely drape  " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rating: 4, comment: "Lovely drape", author: "Test B." });
    expect(res.body.userId).toBeUndefined();
    expectError(await post({ rating: 3 }), 409, "ALREADY_REVIEWED");
    const p = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    expect([Number(p.ratingAvg), p.ratingCount]).toEqual([4, 1]);

    // GET lists it (newest first, paginated) and is publicly cacheable for guests.
    const list = await api().get(`/api/products/${product.slug}/reviews`);
    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ rating: 4, comment: "Lovely drape", author: "Test B." });
    expect(list.body.meta).toMatchObject({ total: 1, page: 1 });
  });

  it("requires a session, and 404s / 400s like the other catalog routes", async () => {
    const product = await createProduct();
    expectError(await api().post(`/api/products/${product.slug}/reviews`, { rating: 5 }), 401, "UNAUTHENTICATED");
    expectError(await api().get("/api/products/no-such-product/reviews"), 404, "NOT_FOUND");
    expect(expectError(await api().get("/api/products/Bad_Slug/reviews"), 400, "VALIDATION_ERROR").details![0].path).toBe("params.slug");
    expectError(await api().put(`/api/products/${product.slug}/reviews`, {}), 404, "NOT_FOUND");
  });
});
