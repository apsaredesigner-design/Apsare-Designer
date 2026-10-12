// Server-side data access for Server Components (storefront pages, generateMetadata).
//
// A Server Component must not fetch this app's own /api over HTTP: a relative URL
// has no origin on the server, and a self-request breaks `next build` prerendering.
// These call the same services as the Route Handlers instead, with the same Zod
// schemas (invalid input throws the same 400 HttpError the route would answer) and
// the same JSON serialisation (Prisma Decimal → number, Date → ISO string), so each
// function returns exactly the body of the matching GET /api/... route.
//
// Every call is a guest call (no userId), as the SSR fetches were: they never
// forwarded the browser's cookie. Per-user data (inWishlist, the cart) stays in
// client components, which call api() against /api. So nothing user-specific can
// leak into a rendered page.
//
// `cache` (React) dedupes a call made by both generateMetadata and the page within
// one request; it does not persist anything across requests.
import { cache } from "react";
import { parse as parseQueryString } from "node:querystring";
import type { z } from "zod";
import type { CategoryDetail, HomeResponse, Paginated, Product, ProductListResponse, ProductSummary, Review } from "@/types";
import { decimalReplacer, runSchemas } from "./http/route";
import * as categories from "./modules/categories/categories.service";
import * as products from "./modules/products/products.service";
import { listQuery, reviewsQuery, slugParams } from "./modules/products/products.schemas";

/** The route's JSON body, parsed back: Decimals as numbers, Dates as ISO strings. */
function asJson<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data, decimalReplacer)) as T;
}

function validParams(slug: string): z.output<typeof slugParams> {
  return runSchemas({ params: slugParams }, { body: undefined, query: undefined, params: { slug } }).params as z.output<typeof slugParams>;
}

/** A query string ("a=1&b=2" or URLSearchParams), parsed as route() parses `url.search`. */
function validQuery<S extends z.ZodType>(schema: S, search: string | URLSearchParams): z.output<S> {
  const raw = { ...parseQueryString(search.toString()) };
  return runSchemas({ query: schema }, { body: undefined, query: raw, params: undefined }).query as z.output<S>;
}

/** GET /api/products/home */
export const getHome = cache(async (): Promise<HomeResponse> => asJson(await products.getHome()));

/** GET /api/categories/:slug (404 HttpError when missing or hidden). */
export const getCategory = cache(
  async (slug: string): Promise<CategoryDetail> => asJson(await categories.getCategoryBySlug(validParams(slug).slug)),
);

/** GET /api/products?<search> */
export async function listProducts(search: string | URLSearchParams): Promise<ProductListResponse> {
  return asJson(await products.listProducts(validQuery(listQuery, search)));
}

/** GET /api/products/:slug (guest view: no inWishlist). */
export const getProduct = cache(async (slug: string): Promise<Product> => asJson(await products.getProduct(validParams(slug).slug)));

/** GET /api/products/:slug/similar */
export async function getSimilar(slug: string): Promise<ProductSummary[]> {
  return asJson(await products.getSimilar(validParams(slug).slug));
}

/** GET /api/products/:slug/reviews?<search> */
export async function getReviews(slug: string, search: string | URLSearchParams = ""): Promise<Paginated<Review>> {
  return asJson(await products.listReviews(validParams(slug).slug, validQuery(reviewsQuery, search)));
}
