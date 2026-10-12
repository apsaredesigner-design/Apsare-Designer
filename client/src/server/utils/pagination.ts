import { z } from "zod";

/** Deepest page any list serves; a larger `page` is a 400 (not a slow, huge OFFSET). */
export const MAX_PAGE = 10_000;

/**
 * `?page=&limit=`: extend it for list endpoints, e.g. `paginationQuery.extend({ q: z.string().optional() })`.
 * A page past the end is not an error: 200 with `items: []` and the real `meta.total`.
 */
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

/** Prisma `skip`/`take` for a page. */
export function toSkipTake({ page, limit }: PaginationQuery) {
  return { skip: (page - 1) * limit, take: limit };
}

/** The response shape every list endpoint returns. */
export function paginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = Math.ceil(total / limit);
  return { items, meta: { page, limit, total, totalPages, hasNext: page < totalPages } };
}
