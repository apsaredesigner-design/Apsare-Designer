import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake, type PaginationQuery } from "../../utils/pagination";
import { addToCart } from "../cart/cart.service";
import { purchasableProductWhere, summarySelect, toSummary } from "../products/products.service";

/**
 * My wishlist as `ProductSummary & { addedAt }`, newest first. Only purchasable
 * products are listed (inactive or hidden-category ones are left out, and come
 * back if the product is re-listed).
 */
export async function listWishlist(userId: number, q: PaginationQuery) {
  const where = { userId, product: await purchasableProductWhere() };
  const [rows, total] = await Promise.all([
    prisma.wishlistItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...toSkipTake(q),
      select: { createdAt: true, product: { select: summarySelect } },
    }),
    prisma.wishlistItem.count({ where }),
  ]);
  const items = rows.map((r) => ({ ...toSummary(r.product), addedAt: r.createdAt }));
  return paginated(items, total, q.page, q.limit);
}

/** Idempotent add. 404 unless the product is purchasable. */
export async function addToWishlist(userId: number, productId: number) {
  const product = await prisma.product.findFirst({ where: { AND: [await purchasableProductWhere(), { id: productId }] }, select: { id: true } });
  if (!product) throw new HttpError(404, "Product not found");
  const { count } = await prisma.wishlistItem.createMany({ data: [{ userId, productId }], skipDuplicates: true });
  return { productId, inWishlist: true as const, added: count > 0 };
}

export async function removeFromWishlist(userId: number, productId: number) {
  const { count } = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  return { productId, inWishlist: false as const, removed: count > 0 };
}

/** Adds the chosen variant to the cart (add rules apply) and removes the product from the wishlist. */
export function moveToCart(userId: number, productId: number, variantId: number, quantity: number) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } }, select: { id: true } });
    if (!item) throw new HttpError(404, "Product is not in your wishlist");
    const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
    if (variant?.productId !== productId) throw new HttpError(400, "Selected size/colour does not belong to this product", "VARIANT_MISMATCH");
    const added = await addToCart(userId, variantId, quantity, tx);
    await tx.wishlistItem.delete({ where: { id: item.id } });
    return added;
  });
}
