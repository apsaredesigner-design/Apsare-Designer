import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";
import { isPurchasable, visibleCategoryIds } from "../products/products.service";
import { computeCartSummary, getStoreSettings, validateCoupon, type CartSummary, type Db } from "./cart.pricing";
import { MAX_QTY_PER_LINE } from "./cart.schemas";

export { MAX_QTY_PER_LINE } from "./cart.schemas";

export type LineIssue = "INACTIVE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | null;

const cartInclude = {
  variant: {
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      colorHex: true,
      stock: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          slug: true,
          brand: true,
          mrp: true,
          salePrice: true,
          discountPercent: true,
          isActive: true,
          categoryId: true,
          images: { select: { id: true, url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

export interface CartCoupon {
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  expiresAt: Date | null;
  firstOrderOnly: boolean;
}

/** Public, client-safe view of a coupon (no usage counters or flags). */
export function publicCoupon(c: {
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: { toString(): string };
  maxDiscount: { toString(): string } | null;
  minOrderAmount: { toString(): string };
  expiresAt: Date | null;
  firstOrderOnly: boolean;
}): CartCoupon {
  return {
    code: c.code,
    description: c.description,
    type: c.type,
    value: Number(c.value.toString()),
    maxDiscount: c.maxDiscount == null ? null : Number(c.maxDiscount.toString()),
    minOrderAmount: Number(c.minOrderAmount.toString()),
    expiresAt: c.expiresAt,
    firstOrderOnly: c.firstOrderOnly,
  };
}

/**
 * The full cart response: every line with its current price, stock and an
 * `available` flag, plus the server-computed summary (available lines only).
 * A purchasable line whose stock fell below its quantity (but not to 0) is
 * clamped to the stock in the DB and reported in `adjustments`, so the cart
 * stays checkout-ready; an out-of-stock line is kept and flagged instead.
 * A line whose product is inactive or in a hidden category is `INACTIVE`.
 * An invalid `couponCode` never fails the request: it comes back as
 * `couponError` with `coupon: null`.
 */
export async function loadCart(userId: number, couponCode?: string, db: Db = prisma) {
  const [rows, settings, visible] = await Promise.all([
    db.cartItem.findMany({ where: { userId }, include: cartInclude, orderBy: { createdAt: "desc" } }),
    getStoreSettings(db),
    visibleCategoryIds(),
  ]);

  // Clamp lines whose stock dropped below the quantity (stock > 0) and report them.
  const adjustments: { itemId: number; variantId: number; from: number; to: number }[] = [];
  for (const r of rows) {
    const { stock, product } = r.variant;
    if (stock > 0 && stock < r.quantity && isPurchasable(product, visible)) {
      await db.cartItem.updateMany({ where: { id: r.id }, data: { quantity: stock } }); // updateMany: no 404 if removed meanwhile
      adjustments.push({ itemId: r.id, variantId: r.variant.id, from: r.quantity, to: stock });
      r.quantity = stock;
    }
  }

  const items = rows.map((r) => {
    const { product, ...variant } = r.variant;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omitted on purpose (rest destructuring)
    const { isActive: _a, categoryId: _c, ...productOut } = product;
    const issue: LineIssue = !isPurchasable(product, visible)
      ? "INACTIVE"
      : variant.stock <= 0
        ? "OUT_OF_STOCK"
        : variant.stock < r.quantity
          ? "INSUFFICIENT_STOCK"
          : null;
    const mrp = Number(product.mrp.toString());
    const salePrice = Number(product.salePrice.toString());
    return {
      id: r.id,
      quantity: r.quantity,
      available: issue === null,
      issue,
      maxQuantity: Math.max(0, Math.min(variant.stock, MAX_QTY_PER_LINE)),
      lineMrp: Math.round(mrp * r.quantity * 100) / 100,
      lineTotal: Math.round(salePrice * r.quantity * 100) / 100,
      variant: { ...variant, product: productOut },
    };
  });

  const priced = items
    .filter((i) => i.available)
    .map((i) => ({ mrp: i.variant.product.mrp, salePrice: i.variant.product.salePrice, quantity: i.quantity }));
  let summary: CartSummary = computeCartSummary(priced, settings);

  let coupon: CartCoupon | null = null;
  let couponError: string | null = null;
  if (couponCode?.trim()) {
    try {
      if (summary.subtotal <= 0) throw new HttpError(400, "Your bag is empty");
      const c = await validateCoupon(couponCode, summary.subtotal, userId, db);
      coupon = publicCoupon(c);
      summary = computeCartSummary(priced, settings, c);
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      couponError = e.message;
    }
  }

  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    hasUnavailableItems: items.some((i) => !i.available),
    summary,
    coupon,
    couponError,
    adjustments,
  };
}

/**
 * Adds `quantity` of a variant to the user's cart, merging with an existing
 * line and capping at stock and MAX_QTY_PER_LINE. 404 for an unknown product
 * or one that is not purchasable (inactive or hidden category), 409
 * OUT_OF_STOCK when nothing is in stock. Pass `visible` to reuse one
 * visibleCategoryIds() lookup across many calls.
 * Returns the resulting quantity and whether it was capped.
 */
export async function addToCart(userId: number, variantId: number, quantity: number, db: Db = prisma, visible?: Set<number>) {
  const [variant, visibleIds] = await Promise.all([
    db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true, product: { select: { isActive: true, categoryId: true, name: true } } },
    }),
    visible ?? visibleCategoryIds(),
  ]);
  if (!variant || !isPurchasable(variant.product, visibleIds)) throw new HttpError(404, "Product not found");
  if (variant.stock <= 0) throw new HttpError(409, `${variant.product.name} is out of stock`, "OUT_OF_STOCK");

  const existing = await db.cartItem.findUnique({ where: { userId_variantId: { userId, variantId } }, select: { quantity: true } });
  const requested = (existing?.quantity ?? 0) + quantity;
  const finalQty = Math.min(requested, variant.stock, MAX_QTY_PER_LINE);
  await db.cartItem.upsert({
    where: { userId_variantId: { userId, variantId } },
    create: { userId, variantId, quantity: finalQty },
    update: { quantity: finalQty },
  });
  return { variantId, quantity: finalQty, capped: finalQty < requested, requested };
}

/** addToCart in its own transaction (POST /api/cart). */
export function addItem(userId: number, variantId: number, quantity: number) {
  return prisma.$transaction((tx) => addToCart(userId, variantId, quantity, tx));
}

/** A cart line owned by `userId`, else 404 (never leaks other users' items). */
async function findOwnItem(userId: number, itemId: number, db: Db = prisma) {
  const item = await db.cartItem.findFirst({
    where: { id: itemId, userId },
    select: { id: true, variantId: true, quantity: true, variant: { select: { stock: true, productId: true } } },
  });
  if (!item) throw new HttpError(404, "Cart item not found");
  return item;
}

export function capNotice(r: { capped: boolean; quantity: number }) {
  return r.capped ? `Quantity limited to ${r.quantity} (stock or per-item limit of ${MAX_QTY_PER_LINE})` : null;
}

/** Sets a line's quantity, capped at stock. 409 OUT_OF_STOCK when stock is 0. */
export async function updateItemQuantity(userId: number, itemId: number, quantity: number) {
  const item = await findOwnItem(userId, itemId);
  if (item.variant.stock <= 0) throw new HttpError(409, "This item is out of stock", "OUT_OF_STOCK");
  const finalQty = Math.min(quantity, item.variant.stock);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: finalQty } });
  return { capped: finalQty < quantity, quantity: finalQty };
}

export async function removeItem(userId: number, itemId: number) {
  const { count } = await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
  if (!count) throw new HttpError(404, "Cart item not found");
}

export async function clearCart(userId: number) {
  await prisma.cartItem.deleteMany({ where: { userId } });
}

/** Moves a line to the wishlist (upsert) and removes it from the cart. 404 if the product is not purchasable. */
export async function moveToWishlist(userId: number, itemId: number) {
  const visible = await visibleCategoryIds();
  await prisma.$transaction(async (tx) => {
    const item = await findOwnItem(userId, itemId, tx);
    const product = await tx.product.findUnique({ where: { id: item.variant.productId }, select: { isActive: true, categoryId: true } });
    if (!product || !isPurchasable(product, visible)) throw new HttpError(404, "Product not found");
    const productId = item.variant.productId;
    await tx.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    await tx.cartItem.delete({ where: { id: item.id } });
  });
}

/** Guest cart after login: duplicates are summed and each line follows the add rules. */
export async function mergeCart(userId: number, items: { variantId: number; quantity: number }[]) {
  const totals = new Map<number, number>();
  for (const i of items) totals.set(i.variantId, (totals.get(i.variantId) ?? 0) + i.quantity);

  const visible = await visibleCategoryIds();
  const merged: { variantId: number; quantity: number; capped: boolean }[] = [];
  const skipped: { variantId: number; reason: "OUT_OF_STOCK" | "NOT_FOUND" }[] = [];
  await prisma.$transaction(async (tx) => {
    for (const [variantId, quantity] of totals) {
      try {
        const r = await addToCart(userId, variantId, quantity, tx, visible);
        merged.push({ variantId, quantity: r.quantity, capped: r.capped });
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        skipped.push({ variantId, reason: e.code === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "NOT_FOUND" });
      }
    }
  });
  return { merged, skipped };
}
