import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import { recomputeRating } from "../products/products.service";
import type { ListQuery } from "./admin.reviews.schemas";
import { toOrderBy } from "./admin.shared";

// Review moderation (extracted from server admin.reviews.ts). Reviews are created by
// customers (POST /api/products/:slug/reviews).

const select = {
  id: true,
  productId: true,
  userId: true,
  rating: true,
  comment: true,
  createdAt: true,
  product: { select: { id: true, name: true, slug: true, code: true } },
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReviewSelect;

export async function listReviews(q: ListQuery) {
  const where: Prisma.ReviewWhereInput = {
    ...(q.productId ? { productId: q.productId } : {}),
    ...(q.userId ? { userId: q.userId } : {}),
    ...(q.rating ? { rating: q.rating } : q.minRating || q.maxRating ? { rating: { gte: q.minRating, lte: q.maxRating } } : {}),
    ...(q.q
      ? {
          OR: [
            { comment: { contains: q.q, mode: "insensitive" } },
            { product: { name: { contains: q.q, mode: "insensitive" } } },
            { product: { code: { contains: q.q, mode: "insensitive" } } },
            { user: { fullName: { contains: q.q, mode: "insensitive" } } },
            { user: { email: { contains: q.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy: [toOrderBy(q.sort), { id: "desc" }], ...toSkipTake(q), select }),
    prisma.review.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

export async function getReview(id: number) {
  const review = await prisma.review.findUnique({ where: { id }, select });
  if (!review) throw new HttpError(404, "Review not found");
  return review;
}

/** Deletes a review and recomputes the product's ratingAvg / ratingCount in the same transaction. The route answers 204. */
export async function deleteReview(id: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id }, select: { productId: true } });
    if (!review) throw new HttpError(404, "Review not found");
    await tx.review.delete({ where: { id } });
    await recomputeRating(tx, review.productId);
  });
}
