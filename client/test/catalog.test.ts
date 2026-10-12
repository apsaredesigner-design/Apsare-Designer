// Port of the removed Express suite's test/catalog.test.ts (Phase 2 parity proof): same assertions, only the imports changed.
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { createCategory, createProduct, createUser } from "./helpers/factories";
import { api, expectError, loginWith } from "./helpers/http";

interface Summary {
  id: number; code: string; slug: string; salePrice: number; discountPercent: number; ratingAvg: number; inStock: boolean;
  category: { slug: string }; inWishlist?: boolean;
}
const list = async (qs: string) => {
  const res = await api().get(`/api/products?${qs}`);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body as { items: Summary[]; meta: { total: number; page: number; totalPages: number; hasNext: boolean }; facets: Record<string, never> };
};
const all = async (qs = "") => (await list(`limit=100&${qs}`)).items;
const codes = (items: Summary[]) => items.map((i) => i.code);
const monotonic = (xs: number[], dir: "asc" | "desc") => xs.every((x, i) => i === 0 || (dir === "asc" ? xs[i - 1] <= x : xs[i - 1] >= x));

/** Purchasable products straight from the DB (categories here are at most two levels deep). */
const visibleCount = () =>
  db.product.count({
    where: { isActive: true, category: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] } },
  });
let seededTotal: number;
beforeAll(async () => {
  seededTotal = await visibleCount();
});

describe("sorting", () => {
  it.each(["recommended", "newest", "price_asc", "price_desc", "discount", "popularity", "rating"])("sort=%s returns every product, stably paged", async (sort) => {
    const full = await all(`sort=${sort}`);
    expect(full).toHaveLength(seededTotal);
    const p1 = (await list(`sort=${sort}&limit=7&page=1`)).items;
    const p2 = (await list(`sort=${sort}&limit=7&page=2`)).items;
    expect([...codes(p1), ...codes(p2)]).toEqual(codes(full).slice(0, 14));
  });

  it("orders by the requested field", async () => {
    expect(monotonic((await all("sort=price_asc")).map((i) => i.salePrice), "asc")).toBe(true);
    expect(monotonic((await all("sort=price_desc")).map((i) => i.salePrice), "desc")).toBe(true);
    expect(monotonic((await all("sort=discount")).map((i) => i.discountPercent), "desc")).toBe(true);
    expect(monotonic((await all("sort=rating")).map((i) => Number(i.ratingAvg)), "desc")).toBe(true);

    const sold = new Map((await db.product.findMany({ select: { id: true, soldCount: true } })).map((p) => [p.id, p.soldCount]));
    expect(monotonic((await all("sort=popularity")).map((i) => sold.get(i.id)!), "desc")).toBe(true);
    const created = new Map((await db.product.findMany({ select: { id: true, createdAt: true } })).map((p) => [p.id, p.createdAt.getTime()]));
    expect(monotonic((await all("sort=newest")).map((i) => created.get(i.id)!), "desc")).toBe(true);
  });

  it("rejects an unknown sort", async () => {
    const err = expectError(await api().get("/api/products?sort=price"), 400, "VALIDATION_ERROR");
    expect(err.details![0].path).toBe("query.sort");
  });
});

describe("filters and facets", () => {
  it("combines category (with descendants), price, stock and sort", async () => {
    const res = await list("category=sarees&maxPrice=5000&minPrice=2000&inStock=true&sort=price_asc&limit=100");
    const sareeSlugs = ["sarees", "silk-sarees", "cotton-sarees", "georgette-sarees", "banarasi-sarees"];
    expect(res.items.length).toBeGreaterThan(0);
    for (const i of res.items) {
      expect(sareeSlugs).toContain(i.category.slug);
      expect(i.salePrice).toBeGreaterThanOrEqual(2000);
      expect(i.salePrice).toBeLessThanOrEqual(5000);
      expect(i.inStock).toBe(true);
    }
    const expected = await db.product.count({
      where: {
        isActive: true, category: { slug: { in: sareeSlugs } }, salePrice: { gte: 2000, lte: 5000 }, variants: { some: { stock: { gt: 0 } } },
      },
    });
    expect(res.meta.total).toBe(expected);
    expect(monotonic(res.items.map((i) => i.salePrice), "asc")).toBe(true);
  });

  it("size, colour and inStock must hold for the same variant", async () => {
    const p = await createProduct({ variants: [{ size: "M", color: "Red", stock: 0 }, { size: "L", color: "Blue", stock: 5 }] });
    expect(codes(await all("size=M&color=Red&inStock=true"))).not.toContain(p.code);
    expect(codes(await all("size=M&color=Red"))).toContain(p.code);
    expect(codes(await all("size=L&color=Blue&inStock=true"))).toContain(p.code);
  });

  it("rejects minPrice > maxPrice and unknown categories", async () => {
    expectError(await api().get("/api/products?minPrice=500&maxPrice=100"), 400, "VALIDATION_ERROR");
    expectError(await api().get("/api/products?category=no-such-category"), 404, "NOT_FOUND");
  });

  it("root category facet counts sum to the total", async () => {
    for (const qs of ["", "inStock=true", "maxPrice=3000", "q=silk"]) {
      const res = await list(qs);
      const cats = res.facets.categories as unknown as { parentSlug: string | null; count: number }[];
      const rootSum = cats.filter((c) => c.parentSlug === null).reduce((n, c) => n + c.count, 0);
      expect(rootSum, qs).toBe(res.meta.total);
    }
  });

  it("each facet ignores its own filter, and its count matches the filtered total", async () => {
    const unfiltered = await list("");
    const fabrics = unfiltered.facets.fabrics as unknown as { value: string; count: number }[];
    const pick = fabrics[0];
    const filtered = await list(`fabric=${encodeURIComponent(pick.value)}`);
    expect(filtered.meta.total).toBe(pick.count);
    expect(filtered.facets.fabrics).toEqual(fabrics); // still lists every fabric
  });
});

describe("search", () => {
  it("finds by name, by code, by code fragment and by category name", async () => {
    expect(codes(await all("q=Kanjivaram"))).toContain("APS-SAR-001");
    expect(codes(await all("q=APS-SAR-001"))).toEqual(["APS-SAR-001"]);
    expect(codes(await all("q=SAR-01"))).toEqual(expect.arrayContaining(["APS-SAR-010", "APS-SAR-011", "APS-SAR-012", "APS-SAR-013"]));
    const lehengas = await all("q=lehengas");
    expect(codes(lehengas)).toEqual(expect.arrayContaining(["APS-LHG-001", "APS-LHG-002", "APS-LHG-003"]));
    const silkSarees = await all("q=silk sarees");
    expect(silkSarees.length).toBeGreaterThan(0);
  });

  it("treats % and _ literally and SQL-ish input as plain text", async () => {
    for (const q of ["%", "_", "%%", "a_b", "' OR 1=1 --", "\" OR \"\"=\"", "silk'; DROP TABLE Product; --", "+silk -saree", "*", "\\"]) {
      const res = await api().get(`/api/products?q=${encodeURIComponent(q)}`);
      expect(res.status, q).toBe(200);
      if (/^[%_\\*]+$|^a_b$|OR/.test(q)) expect(res.body.meta.total, q).toBe(0);
    }
    expect(await db.product.count()).toBeGreaterThanOrEqual(seededTotal); // table still there
  });

  it("strips zero-width characters and folds full-width letters", async () => {
    const plain = codes(await all("q=Kanjivaram"));
    expect(codes(await all(`q=${encodeURIComponent("Kanji\u200Bvaram\u200D")}`))).toEqual(plain);
    expect(codes(await all(`q=${encodeURIComponent("Ｋａｎｊｉｖａｒａｍ")}`))).toEqual(plain);
    // invisible-only input counts as no search
    expect((await list(`q=${encodeURIComponent("\u200B\u200B")}`)).meta.total).toBe(await visibleCount());
  });

  it("q over 100 characters is a 400 (after normalising)", async () => {
    expect((await api().get(`/api/products?q=${"a".repeat(100)}`)).status).toBe(200);
    const err = expectError(await api().get(`/api/products?q=${"a".repeat(101)}`), 400, "VALIDATION_ERROR");
    expect(err.details![0].path).toBe("query.q");
    expectError(await api().get(`/api/products?q=${"a".repeat(5000)}`), 400, "VALIDATION_ERROR");
    // 100 visible characters padded with zero-width ones are fine
    expect((await api().get(`/api/products?q=${encodeURIComponent("a\u200B".repeat(100))}`)).status).toBe(200);
  });
});

describe("pagination", () => {
  it("rejects limit > 100, page > 10000 and junk", async () => {
    for (const qs of ["limit=101", "limit=0", "page=10001", "page=0", "page=1.5", "page=abc", "limit=1e20"]) {
      expectError(await api().get(`/api/products?${qs}`), 400, "VALIDATION_ERROR");
    }
    expect((await api().get("/api/products?page=10000&limit=100")).status).toBe(200);
  });

  it("a page past the end is 200 with empty items and the real meta", async () => {
    const total = await visibleCount();
    const res = await list("page=50&limit=10");
    expect(res.items).toEqual([]);
    expect(res.meta).toEqual({ page: 50, limit: 10, total, totalPages: Math.ceil(total / 10), hasNext: false });
  });
});

describe("visibility", () => {
  it("products under a hidden category (any ancestor) or inactive products are 404 everywhere", async () => {
    const hiddenRoot = await createCategory({ isActive: false });
    const child = await createCategory({ parentId: hiddenRoot.id });
    const hidden = await createProduct({ categoryId: child.id });
    const inactive = await createProduct({ isActive: false });
    for (const p of [hidden, inactive]) {
      expectError(await api().get(`/api/products/${p.slug}`), 404, "NOT_FOUND");
      expectError(await api().get(`/api/products/${p.slug}/similar`), 404, "NOT_FOUND");
      expect(codes(await all(`q=${p.code}`))).toEqual([]);
    }
    expect((await list("")).meta.total).toBe(await visibleCount());
    expectError(await api().get(`/api/categories/${child.slug}`), 404, "NOT_FOUND");
  });

  it("a visible product has detail, breadcrumb and variants", async () => {
    const res = await api().get("/api/products/kanjivaram-silk-saree-with-temple-border");
    expect(res.status).toBe(200);
    expect(res.body.breadcrumb.map((c: { slug: string }) => c.slug)).toEqual(["sarees", "silk-sarees"]);
    expect(res.body.variants.length).toBeGreaterThan(0);
    expect(res.body.inWishlist).toBeUndefined();
  });
});

describe("home and caching", () => {
  it("home has banners and exactly 6 product rails of at most 8", async () => {
    const res = await api().get("/api/products/home");
    expect(res.status).toBe(200);
    const rails = ["newArrivals", "trending", "bestSellers", "deals", "topRated", "underPrice"];
    expect(Object.keys(res.body).sort()).toEqual([...rails, "banners", "underPriceLimit"].sort());
    for (const r of rails) {
      expect(Array.isArray(res.body[r]), r).toBe(true);
      expect(res.body[r].length, r).toBeLessThanOrEqual(8);
    }
    expect(res.body.underPrice.every((p: Summary) => p.salePrice <= res.body.underPriceLimit)).toBe(true);
    expect(res.body.banners.length).toBe(3);
  });

  it("is publicly cacheable for guests and private with a session", async () => {
    const guest = await api().get("/api/products");
    expect(guest.headers["cache-control"]).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(guest.headers.vary).toMatch(/Cookie/);
    const user = await createUser();
    const agent = await loginWith(user.email, user.password);
    const res = await api(agent).get("/api/products?limit=1");
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body.items[0].inWishlist).toBe(false);
  });
});
