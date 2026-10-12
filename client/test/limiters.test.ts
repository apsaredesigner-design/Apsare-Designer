// The route limiters neither suite exercised: coupon (shared by POST /coupons/apply and
// GET /cart?coupon=), orders, cancel, reviews and search. Like rate-limit.test.ts, this
// file turns rate limiting on before any route is imported and shrinks each limit with
// its RATE_LIMIT_<NAME> override. Limiters run after auth and before validation, so
// even invalid requests count (as in Express).
import { afterAll, describe, expect, it, vi } from "vitest";

const saved = vi.hoisted(() => {
  const names = ["NODE_ENV", "RATE_LIMIT_DISABLED", "RATE_LIMIT_COUPON", "RATE_LIMIT_ORDERS", "RATE_LIMIT_CANCEL", "RATE_LIMIT_REVIEWS", "RATE_LIMIT_SEARCH"];
  const keep = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  Object.assign(process.env, {
    NODE_ENV: "development",
    RATE_LIMIT_DISABLED: "0",
    RATE_LIMIT_COUPON: "2",
    RATE_LIMIT_ORDERS: "2",
    RATE_LIMIT_CANCEL: "2",
    RATE_LIMIT_REVIEWS: "2",
    RATE_LIMIT_SEARCH: "2",
  });
  return keep;
});

import { shopper } from "./helpers/checkout";
import { api, expectError, type TestResponse } from "./helpers/http";

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else (process.env as Record<string, string>)[k] = v;
  }
});

const header = (res: TestResponse, name: string) => [res.headers[name] ?? []].flat().join(", ");
const blocked = (res: TestResponse, id: string) => {
  expectError(res, 429, "RATE_LIMITED");
  expect(header(res, "ratelimit")).toMatch(new RegExp(`"${id}"; r=0; t=\\d+`));
  expect(header(res, "ratelimit-policy")).toContain(`"${id}"; q=2;`);
  expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  return res;
};

describe("couponLimiter: one counter for POST /api/coupons/apply and GET /api/cart?coupon=", () => {
  it("GET /api/cart without a (non-blank) coupon doesn't count; with one it does, and shares the counter with apply", async () => {
    const { api: client } = await shopper();
    for (let i = 0; i < 3; i++) {
      expect((await client.get("/api/cart")).status).toBe(200);
      expect((await client.get("/api/cart?coupon=%20%20")).status).toBe(200);
    }
    const first = await client.get("/api/cart?coupon=NOPE1");
    expect(first.status).toBe(200);
    expect(header(first, "ratelimit")).toContain(`"coupon"; r=1;`);
    const second = await client.post("/api/coupons/apply", { code: "NOPE2" });
    expect(second.status).not.toBe(429);
    expect(header(second, "ratelimit")).toContain(`"coupon"; r=0;`);

    // Third coupon request, from either endpoint → 429.
    const cart429 = blocked(await client.get("/api/cart?coupon=NOPE3"), "coupon");
    const apply429 = blocked(await client.post("/api/coupons/apply", { code: "NOPE4" }), "coupon");

    // Express order: cart = router.use(requireAuth, noStore, cartLimiter) then couponLimiter → no-store on its 429;
    // apply = requireAuth, couponLimiter, noStore → its 429 has no Cache-Control.
    expect(cart429.headers["cache-control"]).toBe("private, no-store");
    expect(apply429.headers["cache-control"]).toBeUndefined();

    // A plain cart read still works; the counter is per user.
    expect((await client.get("/api/cart")).status).toBe(200);
    expect((await (await shopper()).api.post("/api/coupons/apply", { code: "NOPE5" })).status).not.toBe(429);
  });

  it("a successful apply below the limit still has no-store (set after the limiter)", async () => {
    const { api: client } = await shopper();
    const res = await client.post("/api/coupons/apply", { code: "NOPE6" });
    expect(res.status).not.toBe(429);
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });
});

describe("orderLimiter / cancelLimiter / reviewLimiter (per user)", () => {
  it("POST /api/orders: the 3rd attempt → 429 (even invalid bodies count); another user is unaffected", async () => {
    const { api: client } = await shopper();
    for (let i = 0; i < 2; i++) expectError(await client.post("/api/orders", {}), 400, "VALIDATION_ERROR");
    blocked(await client.post("/api/orders", {}), "orders");
    expectError(await (await shopper()).api.post("/api/orders", {}), 400, "VALIDATION_ERROR");
    // GET /api/orders has no orderLimiter.
    expect((await client.get("/api/orders")).status).toBe(200);
  });

  it("POST /api/orders/:orderNumber/cancel: the 3rd attempt → 429", async () => {
    const { api: client } = await shopper();
    for (let i = 0; i < 2; i++) expect((await client.post("/api/orders/APS-260101-AAAAA/cancel", {})).status).toBe(404);
    blocked(await client.post("/api/orders/APS-260101-AAAAA/cancel", {}), "cancel");
  });

  it("POST /api/products/:slug/reviews: the 3rd attempt → 429; guests get 401 first (auth before the limiter)", async () => {
    const { api: client } = await shopper();
    for (let i = 0; i < 2; i++) expectError(await client.post("/api/products/no-such-product/reviews", {}), 400, "VALIDATION_ERROR");
    blocked(await client.post("/api/products/no-such-product/reviews", {}), "reviews");
    for (let i = 0; i < 3; i++) expectError(await api().post("/api/products/no-such-product/reviews", {}), 401, "UNAUTHENTICATED");
  });
});

describe("searchLimiter: GET /api/products counts only a non-blank `q`", () => {
  it("blank, missing or repeated `q` never count; the 3rd real search → 429 without cache headers", async () => {
    const guest = api();
    for (let i = 0; i < 3; i++) {
      expect((await guest.get("/api/products")).status).toBe(200);
      expect((await guest.get("/api/products?q=%20")).status).toBe(200);
      expect((await guest.get("/api/products?q=a&q=b")).status).not.toBe(429);
    }
    for (let i = 0; i < 2; i++) expect((await guest.get("/api/products?q=silk")).status).toBe(200);
    const res = blocked(await guest.get("/api/products?q=silk"), "search");
    // Express: optionalAuth, searchLimiter, validate, publicCache → no Cache-Control / Vary on the 429.
    expect(res.headers["cache-control"]).toBeUndefined();
    expect(res.headers.vary).toBeUndefined();
    // Browsing without a search still works while blocked.
    expect((await guest.get("/api/products?q=")).status).toBe(200);
  });
});
