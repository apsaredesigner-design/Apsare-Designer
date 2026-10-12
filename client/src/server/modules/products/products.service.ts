import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake, type PaginationQuery } from "../../utils/pagination";
import { likeSafe } from "../../utils/search";
import { breadcrumbOf, loadCategoryIndex, subtreeIds, type CategoryIndex } from "../categories/categories.service";
import type { CreateReviewBody, ListQuery } from "./products.schemas";

// ─── Shapes ───────────────────────────────────────────────────

/** Listing card data. Only the first 2 images (primary + hover) are sent. */
export const summarySelect = {
  id: true,
  code: true,
  name: true,
  slug: true,
  brand: true,
  mrp: true,
  salePrice: true,
  discountPercent: true,
  ratingAvg: true,
  ratingCount: true,
  isNewArrival: true,
  isTrending: true,
  isBestSeller: true,
  isDealOfDay: true,
  category: { select: { name: true, slug: true } },
  images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 2 },
  variants: { select: { size: true, color: true, colorHex: true, stock: true }, orderBy: { id: "asc" } },
} satisfies Prisma.ProductSelect;

export type SummaryRow = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

/** Distinct sizes/colours (variant order) and a stock flag instead of the raw variants. */
export function toSummary<T extends Pick<SummaryRow, "variants">>(row: T) {
  const { variants, ...rest } = row;
  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = new Map<string, { name: string; hex: string | null }>();
  for (const v of variants) if (!colors.has(v.color)) colors.set(v.color, { name: v.color, hex: v.colorHex });
  return { ...rest, sizes, colors: [...colors.values()], inStock: variants.some((v) => v.stock > 0) };
}

// ─── Visibility ───────────────────────────────────────────────

/**
 * Ids of visible categories: active and reachable from an active root through
 * active ancestors, at any depth. This is exactly the set the public category
 * tree and the listing use (loadCategoryIndex), so every check agrees.
 */
export async function visibleCategoryIds(): Promise<Set<number>> {
  return new Set((await loadCategoryIndex({ withCounts: false })).byId.keys());
}

/** In-memory form of the predicate, for rows already loaded (cart lines, order lines). */
export function isPurchasable(product: { isActive: boolean; categoryId: number }, visible: Set<number>): boolean {
  return product.isActive && visible.has(product.categoryId);
}

/**
 * THE purchasable/visible-product predicate: the product is active and its
 * category (and every ancestor) is active. Every public read and every
 * cart/wishlist/order write goes through this (or isPurchasable).
 */
export async function purchasableProductWhere(visible?: Set<number>): Promise<Prisma.ProductWhereInput> {
  return { isActive: true, categoryId: { in: [...(visible ?? (await visibleCategoryIds()))] } };
}

async function withWishlistFlag<T extends { id: number }>(items: T[], userId?: number) {
  if (!userId || !items.length) return items;
  const saved = await prisma.wishlistItem.findMany({
    where: { userId, productId: { in: items.map((i) => i.id) } },
    select: { productId: true },
  });
  const ids = new Set(saved.map((s) => s.productId));
  return items.map((i) => ({ ...i, inWishlist: ids.has(i.id) }));
}

// ─── Search ───────────────────────────────────────────────────

const MIN_TOKEN = 3; // innodb_ft_min_token_size default, kept for parity with the old MySQL behavior
/**
 * InnoDB's default FULLTEXT stopwords (3+ letters). A required (+) stopword would match
 * nothing. Kept as-is for parity even though Postgres's own `english` text-search config
 * additionally drops its own (different, larger) stopword list at the to_tsvector/to_tsquery
 * stage — that is a genuine, accepted behavior difference; see products.service.ts search notes.
 */
const STOPWORDS = new Set(["about", "are", "com", "for", "from", "how", "that", "the", "this", "was", "what", "when", "where", "who", "will", "with", "und", "www"]);

/** Table/column identifiers exactly as Prisma names them (PascalCase model, camelCase columns). */
const SEARCH_VECTOR = Prisma.sql`to_tsvector('english', "name" || ' ' || "brand" || ' ' || "code" || ' ' || coalesce("description", ''))`;

/**
 * Turns free text into a safe `to_tsquery` expression: every word is required (`&`)
 * and prefix-matched (`:*`). Hyphenated words (product codes like APS-SAR-001) are
 * dropped here rather than fought into `to_tsquery` syntax: `to_tsquery` has no
 * MySQL-style phrase quoting, and Postgres's own phrase operator (`<->`) depends on
 * the text-search parser's tokenisation of the hyphenated compound lining up lexeme
 * positions exactly with its split parts, which isn't reliable enough to `&` alongside
 * other required terms. `codeWhere` (a parallel `contains` clause built from the whole
 * raw query, applied as an OR alongside this expression's matches) already covers
 * exact and partial product-code lookups, including hyphenated ones — see searchWhere.
 * Returns null when no word is long enough to be indexed (a query made only of
 * hyphenated/code-like terms falls through to the plain-`contains` path, which still
 * has `codeWhere`).
 */
function toTsQuery(q: string): string | null {
  const terms = q
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, "").replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= MIN_TOKEN && !STOPWORDS.has(t.toLowerCase()) && !t.includes("-"));
  if (!terms.length) return null;
  return terms.map((t) => `${t}:*`).join(" & ");
}

/**
 * Every product id matching the GIN-indexed tsvector, best score first (Map keeps
 * insertion order). No LIMIT: the id set is the filter, so `meta.total` and the
 * facets are computed over the full match set. It is bounded by the size of
 * the Product table; the expression is a bound parameter.
 */
async function fullTextScores(expr: string): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; score: number }[]>(Prisma.sql`
    SELECT id, ts_rank(${SEARCH_VECTOR}, to_tsquery('english', ${expr})) AS score
    FROM "Product"
    WHERE "isActive" = true AND ${SEARCH_VECTOR} @@ to_tsquery('english', ${expr})
    ORDER BY score DESC, id DESC`);
  return new Map(rows.map((r) => [Number(r.id), Number(r.score)]));
}

interface Search {
  where: Prisma.ProductWhereInput;
  /** FULLTEXT scores (3+ char queries only). */
  scores?: Map<number, number>;
  /** Product-code substring hits: ranked above text hits. */
  codeWhere: Prisma.ProductWhereInput;
}

/**
 * Categories (with their whole subtree) whose name chain contains every word of
 * `q`: "sarees" matches Sarees and all its children, "silk sarees" matches
 * Sarees › Silk. Case-insensitive; the category index is already in memory.
 */
function categoryMatches(q: string, index: CategoryIndex): number[] {
  const words = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matched = [...index.byId.values()].filter((node) => {
    const chain = breadcrumbOf(index, node.id).map((c) => c.name.toLocaleLowerCase()).join(" ");
    return words.every((w) => chain.includes(w));
  });
  return [...new Set(matched.flatMap(subtreeIds))];
}

/**
 * Where-clause for `q`. Queries under 3 characters (or with no indexable word)
 * fall back to `contains`. A product code substring always matches, and so do
 * products in a matching category (categoryMatches).
 */
async function searchWhere(q: string, index: CategoryIndex): Promise<Search> {
  const expr = q.length >= MIN_TOKEN ? toTsQuery(q) : null;
  const like = likeSafe(q);
  const codeWhere: Prisma.ProductWhereInput = { code: { contains: like, mode: "insensitive" } };
  const categoryIds = categoryMatches(q, index);
  const byCategory: Prisma.ProductWhereInput[] = categoryIds.length ? [{ categoryId: { in: categoryIds } }] : [];
  if (!expr) {
    return {
      where: {
        OR: [
          { name: { contains: like, mode: "insensitive" } },
          { brand: { contains: like, mode: "insensitive" } },
          codeWhere,
          { description: { contains: like, mode: "insensitive" } },
          ...byCategory,
        ],
      },
      codeWhere,
    };
  }
  const scores = await fullTextScores(expr);
  return { where: { OR: [{ id: { in: [...scores.keys()] } }, codeWhere, ...byCategory] }, scores, codeWhere };
}

// ─── Listing ──────────────────────────────────────────────────

type Facet = "category" | "fabric" | "occasion" | "size" | "color" | "price";

const ORDER_BY: Record<ListQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  recommended: [{ isTrending: "desc" }, { soldCount: "desc" }, { ratingAvg: "desc" }, { id: "desc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  price_asc: [{ salePrice: "asc" }, { id: "asc" }],
  price_desc: [{ salePrice: "desc" }, { id: "desc" }],
  discount: [{ discountPercent: "desc" }, { soldCount: "desc" }, { id: "desc" }],
  popularity: [{ soldCount: "desc" }, { id: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "desc" }],
};

/** Relevance ranking covers at most this many top hits; the rest follow in `recommended` order. */
const RANKED_MAX = 500;
/** Upper bound on variant rows scanned for the size/colour facets. */
const FACET_SCAN_MAX = 20_000;

const SIZE_ORDER = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
function compareSize(a: string, b: string) {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b, undefined, { numeric: true });
}

const byCountDesc = (a: { count: number; value: string }, b: { count: number; value: string }) =>
  b.count - a.count || a.value.localeCompare(b.value);

export async function listProducts(query: ListQuery, userId?: number) {
  const index = await loadCategoryIndex({ withCounts: false });

  let categoryIds = [...index.byId.keys()];
  if (query.category) {
    const node = index.bySlug.get(query.category);
    if (!node) throw new HttpError(404, "Category not found");
    categoryIds = subtreeIds(node);
  }

  const search = query.q ? await searchWhere(query.q, index) : undefined;

  /** The full filter, minus one facet's own filter when computing that facet. */
  const where = (exclude?: Facet): Prisma.ProductWhereInput => {
    const and: Prisma.ProductWhereInput[] = [
      { isActive: true, categoryId: { in: exclude === "category" ? [...index.byId.keys()] : categoryIds } },
    ];
    if (search) and.push(search.where);
    if (query.fabric?.length && exclude !== "fabric") and.push({ fabric: { in: query.fabric } });
    if (query.occasion?.length && exclude !== "occasion") and.push({ occasion: { in: query.occasion } });
    if (exclude !== "price" && (query.minPrice !== undefined || query.maxPrice !== undefined)) {
      and.push({ salePrice: { gte: query.minPrice, lte: query.maxPrice } });
    }
    if (query.minDiscount !== undefined) and.push({ discountPercent: { gte: query.minDiscount } });
    if (query.minRating !== undefined) and.push({ ratingAvg: { gte: query.minRating } });
    if (query.isNew) and.push({ isNewArrival: true });
    if (query.trending) and.push({ isTrending: true });
    if (query.bestSeller) and.push({ isBestSeller: true });
    if (query.deal) and.push({ isDealOfDay: true });

    // Size, colour and stock must hold for the same variant.
    const variant: Prisma.ProductVariantWhereInput = {};
    if (query.size?.length && exclude !== "size") variant.size = { in: query.size };
    if (query.color?.length && exclude !== "color") variant.color = { in: query.color };
    if (query.inStock) variant.stock = { gt: 0 };
    if (Object.keys(variant).length) and.push({ variants: { some: variant } });
    return { AND: and };
  };

  const full = where();
  const relevance = query.sort === "recommended" ? search?.scores : undefined;

  const page = async (): Promise<{ rows: SummaryRow[]; total: number }> => {
    if (!relevance) {
      const [rows, total] = await Promise.all([
        prisma.product.findMany({ where: full, select: summarySelect, orderBy: ORDER_BY[query.sort], ...toSkipTake(query) }),
        prisma.product.count({ where: full }),
      ]);
      return { rows, total };
    }
    // Relevance order: rank the best text hits and any code hits (bounded) in memory;
    // everything else that matches (deeper text hits, category-name hits) follows in
    // `recommended` order, so paging still covers the full, exact `total`.
    const { skip, take } = toSkipTake(query);
    const topIds = [...relevance.keys()].slice(0, RANKED_MAX);
    const [candidates, total] = await Promise.all([
      prisma.product.findMany({
        where: { AND: [full, { OR: [{ id: { in: topIds } }, search!.codeWhere] }] },
        select: { id: true, soldCount: true },
        orderBy: [{ soldCount: "desc" }, { id: "desc" }],
        take: RANKED_MAX * 2,
      }),
      prisma.product.count({ where: full }),
    ]);
    const top = Math.max(0, ...relevance.values()) + 1; // exact code hits outrank text hits
    candidates.sort((a, b) => (relevance.get(b.id) ?? top) - (relevance.get(a.id) ?? top) || b.soldCount - a.soldCount || b.id - a.id);
    const pageIds = candidates.slice(skip, skip + take).map((r) => r.id);
    const ranked = pageIds.length
      ? await prisma.product.findMany({ where: { id: { in: pageIds } }, select: summarySelect })
      : [];
    const pos = new Map(pageIds.map((id, i) => [id, i]));
    ranked.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
    const rest =
      pageIds.length < take
        ? await prisma.product.findMany({
            where: { AND: [full, { id: { notIn: candidates.map((c) => c.id) } }] },
            select: summarySelect,
            orderBy: ORDER_BY.recommended,
            skip: Math.max(0, skip - candidates.length),
            take: take - pageIds.length,
          })
        : [];
    return { rows: [...ranked, ...rest], total };
  };

  const [{ rows, total }, facets] = await Promise.all([page(), computeFacets(index, where)]);
  const items = await withWishlistFlag(rows.map(toSummary), userId);
  return { ...paginated(items, total, query.page, query.limit), facets };
}

async function computeFacets(index: CategoryIndex, where: (exclude?: Facet) => Prisma.ProductWhereInput) {
  const [byCategory, byFabric, byOccasion, sizeRows, colorRows, price] = await Promise.all([
    prisma.product.groupBy({ by: ["categoryId"], where: where("category"), _count: { _all: true } }),
    prisma.product.groupBy({ by: ["fabric"], where: { AND: [where("fabric"), { fabric: { not: null } }] }, _count: { _all: true } }),
    prisma.product.groupBy({ by: ["occasion"], where: { AND: [where("occasion"), { occasion: { not: null } }] }, _count: { _all: true } }),
    // distinct (product, size) pairs so a product with 3 colours counts once per size
    // Bounded scans (FACET_SCAN_MAX rows) so a huge match set cannot make these unbounded.
    prisma.productVariant.findMany({
      where: { product: where("size") },
      select: { productId: true, size: true },
      distinct: ["productId", "size"],
      take: FACET_SCAN_MAX,
    }),
    prisma.productVariant.findMany({
      where: { product: where("color") },
      select: { productId: true, color: true, colorHex: true },
      distinct: ["productId", "color"],
      take: FACET_SCAN_MAX,
    }),
    prisma.product.aggregate({ where: where("price"), _min: { salePrice: true }, _max: { salePrice: true } }),
  ]);

  // Category counts roll up to ancestors (a Silk saree also counts under Sarees).
  const catCount = new Map<number, number>();
  for (const row of byCategory) {
    for (let node = index.byId.get(row.categoryId); node; node = node.parentId === null ? undefined : index.byId.get(node.parentId)) {
      catCount.set(node.id, (catCount.get(node.id) ?? 0) + row._count._all);
    }
  }
  const categories = [...index.byId.values()]
    .filter((n) => catCount.has(n.id))
    .map((n) => ({
      slug: n.slug,
      name: n.name,
      parentSlug: n.parentId === null ? null : (index.byId.get(n.parentId)?.slug ?? null),
      count: catCount.get(n.id)!,
    }));

  const tally = <K extends string>(rows: Record<K, string>[], key: K) => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r[key], (counts.get(r[key]) ?? 0) + 1);
    return [...counts].map(([value, count]) => ({ value, count }));
  };
  const hexOf = new Map(colorRows.map((r) => [r.color, r.colorHex]));

  return {
    categories,
    fabrics: byFabric.map((r) => ({ value: r.fabric!, count: r._count._all })).sort(byCountDesc),
    occasions: byOccasion.map((r) => ({ value: r.occasion!, count: r._count._all })).sort(byCountDesc),
    sizes: tally(sizeRows, "size").sort((a, b) => compareSize(a.value, b.value)),
    colors: tally(colorRows, "color")
      .map((c) => ({ ...c, hex: hexOf.get(c.value) ?? null }))
      .sort(byCountDesc),
    price: { min: price._min.salePrice, max: price._max.salePrice },
  };
}

// ─── Detail, similar ──────────────────────────────────────────

export async function getProduct(slug: string, userId?: number) {
  const [product, index, ratings, saved] = await Promise.all([
    prisma.product.findFirst({
      where: { slug, isActive: true },
      select: {
        ...summarySelect,
        categoryId: true,
        description: true,
        fabric: true,
        occasion: true,
        pattern: true,
        careInstructions: true,
        specs: true,
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        variants: {
          select: { id: true, sku: true, size: true, color: true, colorHex: true, stock: true },
          orderBy: { id: "asc" },
        },
      },
    }),
    loadCategoryIndex({ withCounts: false }),
    prisma.review.groupBy({ by: ["rating"], where: { product: { slug } }, _count: { _all: true } }),
    userId ? prisma.wishlistItem.findFirst({ where: { userId, product: { slug } }, select: { id: true } }) : null,
  ]);
  // Same rule as purchasableProductWhere: active product (above) in a visible category.
  if (!product || !index.byId.has(product.categoryId)) throw new HttpError(404, "Product not found");

  const distribution: Record<"1" | "2" | "3" | "4" | "5", number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of ratings) distribution[String(r.rating) as keyof typeof distribution] = r._count._all;

  const { categoryId, ...rest } = product;
  return {
    ...toSummary(rest),
    variants: product.variants,
    breadcrumb: breadcrumbOf(index, categoryId),
    reviewSummary: { ratingAvg: product.ratingAvg, ratingCount: product.ratingCount, distribution },
    ...(userId ? { inWishlist: Boolean(saved) } : {}),
  };
}

/** Resolves a public product's id, or 404. */
async function productIdBySlug(slug: string) {
  const product = await prisma.product.findFirst({ where: { AND: [await purchasableProductWhere(), { slug }] }, select: { id: true, categoryId: true } });
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

export async function getSimilar(slug: string) {
  const { id, categoryId } = await productIdBySlug(slug);
  const rows = await prisma.product.findMany({
    where: { AND: [await purchasableProductWhere(), { categoryId, id: { not: id } }] },
    select: summarySelect,
    orderBy: [{ soldCount: "desc" }, { id: "desc" }],
    take: 8,
  });
  return rows.map(toSummary);
}

// ─── Reviews ──────────────────────────────────────────────────

const reviewSelect = {
  id: true,
  productId: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { fullName: true } },
} satisfies Prisma.ReviewSelect;

/** "Ananya Rao" -> "Ananya R." The reviewer's id and full name are never exposed. */
export function reviewerName(fullName: string): string {
  const [first = "", ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

const toReview = ({ user, ...r }: Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>) => ({ ...r, author: reviewerName(user.fullName) });

export async function listReviews(slug: string, query: PaginationQuery) {
  const { id } = await productIdBySlug(slug);
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where: { productId: id }, select: reviewSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...toSkipTake(query) }),
    prisma.review.count({ where: { productId: id } }),
  ]);
  return paginated(items.map(toReview), total, query.page, query.limit);
}

/**
 * Verified-purchase reviews only: the user needs a DELIVERED order containing
 * any variant of the product (403 PURCHASE_REQUIRED). One review per user per
 * product (409). The product's ratingAvg/ratingCount are recomputed from the
 * Review table in the same transaction, so concurrent reviews can't drift.
 */
export async function createReview(slug: string, userId: number, body: CreateReviewBody) {
  const { id: productId } = await productIdBySlug(slug);
  const [purchased, existing] = await Promise.all([
    prisma.orderItem.findFirst({ where: { order: { userId, status: "DELIVERED" }, variant: { productId } }, select: { id: true } }),
    prisma.review.findUnique({ where: { productId_userId: { productId, userId } }, select: { id: true } }),
  ]);
  if (existing) throw new HttpError(409, "You have already reviewed this product", "ALREADY_REVIEWED");
  if (!purchased) throw new HttpError(403, "Only customers who received this product can review it", "PURCHASE_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: { productId, userId, rating: body.rating, comment: body.comment ?? null },
      select: reviewSelect,
    });
    await recomputeRating(tx, productId);
    return toReview(review);
  });
}

/**
 * Recomputes a product's ratingCount / ratingAvg (1 decimal, 0 with no reviews)
 * from the Review table. Call inside the transaction that adds or deletes a review.
 */
export async function recomputeRating(tx: Prisma.TransactionClient, productId: number) {
  await tx.$executeRaw`
    UPDATE "Product" SET
      "ratingCount" = (SELECT COUNT(*) FROM "Review" WHERE "productId" = ${productId}),
      "ratingAvg" = COALESCE((SELECT ROUND(AVG("rating"), 1) FROM "Review" WHERE "productId" = ${productId}), 0)
    WHERE id = ${productId}`;
}

// ─── Home ─────────────────────────────────────────────────────

/** The "under ₹X" home rail: salePrice at or below this. */
export const UNDER_PRICE = 1999;

export async function getHome() {
  const visible = await purchasableProductWhere();
  const rail = (where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[]) =>
    prisma.product.findMany({ where: { AND: [visible, where] }, select: summarySelect, orderBy, take: 8 }).then((r) => r.map(toSummary));

  const [banners, newArrivals, trending, bestSellers, deals, topRated, underPrice] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      select: { id: true, title: true, subtitle: true, imageUrl: true, ctaLabel: true, ctaHref: true, sortOrder: true, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    rail({ isNewArrival: true }, [{ createdAt: "desc" }, { id: "desc" }]),
    rail({ isTrending: true }, [{ soldCount: "desc" }, { id: "desc" }]),
    rail({ isBestSeller: true }, [{ soldCount: "desc" }, { id: "desc" }]),
    rail({ isDealOfDay: true }, [{ discountPercent: "desc" }, { id: "desc" }]),
    rail({ ratingCount: { gt: 0 } }, [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { id: "desc" }]),
    rail({ salePrice: { lte: UNDER_PRICE } }, [{ soldCount: "desc" }, { id: "desc" }]),
  ]);
  return { banners, newArrivals, trending, bestSellers, deals, topRated, underPrice, underPriceLimit: UNDER_PRICE };
}
