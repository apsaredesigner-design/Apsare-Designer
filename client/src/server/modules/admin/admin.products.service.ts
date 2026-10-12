import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import { discountPercent } from "../../utils/pricing";
import type { Tx } from "../cart/cart.pricing";
import type { BulkInput, CreateInput, ListQuery, ProductInput } from "./admin.products.schemas";
import { slugify, toOrderBy, uniqueSlug } from "./admin.shared";

const LOW_STOCK = 5;

const detailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
  variants: { orderBy: { id: "asc" } },
} satisfies Prisma.ProductInclude;

export function getDetail(id: number) {
  return prisma.product.findUnique({ where: { id }, include: detailInclude });
}

async function assertCategory(categoryId: number) {
  const exists = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) throw new HttpError(400, "Category not found", "VALIDATION_ERROR", [{ path: "body.categoryId", message: "Category not found" }]);
}

function productSlug(name: string, excludeId?: number) {
  return uniqueSlug(slugify(name), async (prefix) =>
    (
      await prisma.product.findMany({
        where: { slug: { startsWith: prefix }, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { slug: true },
      })
    ).map((p) => p.slug),
  );
}

/** Scalar columns from the body. discountPercent is always derived here, never read from input. */
function scalarData<T extends ProductInput>(b: T, mrp: number, salePrice: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omitted on purpose (rest destructuring)
  const { images: _i, variants: _v, specs, ...rest } = b;
  return {
    ...rest,
    // null clears the JSON column (Prisma needs DbNull for that)
    ...(specs !== undefined ? { specs: specs === null ? Prisma.DbNull : (specs as Prisma.InputJsonValue) } : {}),
    discountPercent: discountPercent(mrp, salePrice),
  };
}

/** Replaces the image list (images have no references, so delete + recreate is safe). */
async function syncImages(tx: Tx, productId: number, images: NonNullable<ProductInput["images"]>) {
  await tx.productImage.deleteMany({ where: { productId } });
  if (images.length) {
    await tx.productImage.createMany({
      data: images.map((img, i) => ({
        productId,
        url: img.url,
        publicId: img.publicId ?? null,
        alt: img.alt ?? null,
        sortOrder: img.sortOrder ?? i,
      })),
    });
  }
}

/**
 * Upserts the given variants and deletes the ones left out. A variant without
 * `id` is matched to an existing one by SKU. Variants that appear in orders
 * cannot be deleted (409): set their stock to 0 instead.
 */
async function syncVariants(tx: Tx, productId: number, variants: NonNullable<ProductInput["variants"]>) {
  const existing = await tx.productVariant.findMany({ where: { productId }, select: { id: true, sku: true } });
  const byId = new Set(existing.map((v) => v.id));
  const bySku = new Map(existing.map((v) => [v.sku.toUpperCase(), v.id]));

  const resolved = variants.map((v, i) => {
    if (v.id !== undefined && !byId.has(v.id)) {
      throw new HttpError(400, "Variant does not belong to this product", "VALIDATION_ERROR", [
        { path: `body.variants.${i}.id`, message: "Unknown variant" },
      ]);
    }
    return { ...v, id: v.id ?? bySku.get(v.sku.toUpperCase()) };
  });
  const keep = new Set(resolved.map((v) => v.id).filter((id): id is number => id !== undefined));
  const remove = existing.filter((v) => !keep.has(v.id)).map((v) => v.id);

  if (remove.length) {
    const ordered = await tx.orderItem.findFirst({ where: { variantId: { in: remove } }, select: { variant: { select: { sku: true } } } });
    if (ordered) throw new HttpError(409, `Variant ${ordered.variant.sku} has orders and cannot be removed; set its stock to 0 instead`);
    await tx.productVariant.deleteMany({ where: { id: { in: remove } } });
  }
  // Updates before creates so a freed size/colour or SKU can be reused.
  for (const { id, ...data } of resolved) {
    if (id !== undefined) await tx.productVariant.update({ where: { id }, data: { ...data, colorHex: data.colorHex ?? null } });
  }
  const toCreate = resolved.filter((v) => v.id === undefined);
  if (toCreate.length) {
    await tx.productVariant.createMany({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omitted on purpose (rest destructuring)
      data: toCreate.map(({ id: _id, ...v }) => ({ ...v, colorHex: v.colorHex ?? null, productId })),
    });
  }
}

/** An active product needs at least one variant and one image. */
const sellable = { variants: { some: {} }, images: { some: {} } } satisfies Prisma.ProductWhereInput;

/** 400 PRODUCT_INCOMPLETE unless product `id` has ≥ 1 variant and ≥ 1 image. Run after images/variants are synced. */
async function assertSellable(db: Tx | typeof prisma, id: number) {
  const counts = await db.product.findUnique({ where: { id }, select: { _count: { select: { variants: true, images: true } } } });
  if (!counts) throw new HttpError(404, "Product not found");
  const details = [
    ...(counts._count.variants ? [] : [{ path: "body.variants", message: "Add at least one variant before activating" }]),
    ...(counts._count.images ? [] : [{ path: "body.images", message: "Add at least one image before activating" }]),
  ];
  if (details.length) {
    throw new HttpError(400, "An active product needs at least one variant and one image", "PRODUCT_INCOMPLETE", details);
  }
}

/** Soft-deletes (isActive=false) products that appear in orders, hard-deletes the rest. */
export async function deleteProducts(requested: number[]) {
  const ids = (await prisma.product.findMany({ where: { id: { in: requested } }, select: { id: true } })).map((p) => p.id);
  const ordered = await prisma.productVariant.findMany({
    where: { productId: { in: ids }, orderItems: { some: {} } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const softDeleted = ordered.map((v) => v.productId);
  const hardDeleted = ids.filter((id) => !softDeleted.includes(id));
  await prisma.$transaction([
    prisma.product.updateMany({ where: { id: { in: softDeleted } }, data: { isActive: false } }),
    prisma.product.deleteMany({ where: { id: { in: hardDeleted } } }),
  ]);
  return { hardDeleted, softDeleted };
}

// ─── Use cases ──────────────────────────────────────────────────

export async function listProducts(q: ListQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }] } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
    ...(q.isNewArrival !== undefined ? { isNewArrival: q.isNewArrival } : {}),
    ...(q.isTrending !== undefined ? { isTrending: q.isTrending } : {}),
    ...(q.isBestSeller !== undefined ? { isBestSeller: q.isBestSeller } : {}),
    ...(q.isDealOfDay !== undefined ? { isDealOfDay: q.isDealOfDay } : {}),
  };
  if (q.stock === "in") where.variants = { some: { stock: { gt: 0 } } };
  // low = still in stock, but at least one SKU is at or below LOW_STOCK (matches `stockState`)
  if (q.stock === "low") where.AND = [{ variants: { some: { stock: { gt: 0 } } } }, { variants: { some: { stock: { lte: LOW_STOCK } } } }];
  if (q.stock === "out") where.variants = { none: { stock: { gt: 0 } } };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [toOrderBy(q.sort), { id: "desc" }],
      ...toSkipTake(q),
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
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        isDealOfDay: true,
        soldCount: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 1, select: { id: true, url: true, alt: true } },
        variants: { select: { stock: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rows.map(({ images, variants, ...p }) => {
    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
    const lowest = variants.length ? Math.min(...variants.map((v) => v.stock)) : 0;
    return {
      ...p,
      image: images[0] ?? null,
      variantCount: variants.length,
      totalStock,
      stockState: totalStock <= 0 ? "out" : lowest <= LOW_STOCK ? "low" : "in",
    };
  });
  return paginated(items, total, q.page, q.limit);
}

export async function bulkAction({ ids: rawIds, action }: BulkInput) {
  const ids = [...new Set(rawIds)];
  if (action === "delete") {
    const result = await deleteProducts(ids);
    const found = result.hardDeleted.length + result.softDeleted.length;
    return { action, requested: ids.length, affected: found, ...result };
  }
  if (action === "deactivate") {
    const { count } = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    return { action, requested: ids.length, affected: count };
  }
  // activate: products without a variant or an image are skipped (and reported), the rest are activated.
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, _count: { select: { variants: true, images: true } } },
  });
  const skipped = rows
    .filter((p) => !p._count.variants || !p._count.images)
    .map((p) => ({ id: p.id, reason: !p._count.variants ? ("NO_VARIANTS" as const) : ("NO_IMAGES" as const) }));
  const { count } = await prisma.product.updateMany({ where: { id: { in: ids }, ...sellable }, data: { isActive: true } });
  return { action, requested: ids.length, affected: count, skipped };
}

export async function getProductOr404(id: number) {
  const product = await getDetail(id);
  if (!product) throw new HttpError(404, "Product not found");
  return product;
}

export async function createProduct(body: CreateInput) {
  await assertCategory(body.categoryId);
  const slug = await productSlug(body.name);

  const id = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...scalarData(body, body.mrp, body.salePrice), slug },
      select: { id: true },
    });
    if (body.images) await syncImages(tx, product.id, body.images);
    if (body.variants) await syncVariants(tx, product.id, body.variants);
    if (body.isActive !== false) await assertSellable(tx, product.id); // isActive defaults to true
    return product.id;
  });
  return getProductOr404(id);
}

export async function updateProduct(id: number, body: ProductInput) {
  const current = await prisma.product.findUnique({ where: { id }, select: { name: true, mrp: true, salePrice: true } });
  if (!current) throw new HttpError(404, "Product not found");

  const mrp = body.mrp ?? current.mrp.toNumber();
  const salePrice = body.salePrice ?? current.salePrice.toNumber();
  if (salePrice > mrp) {
    throw new HttpError(400, "Validation failed", "VALIDATION_ERROR", [{ path: "body.salePrice", message: "Sale price cannot exceed MRP" }]);
  }
  if (body.categoryId) await assertCategory(body.categoryId);
  // Slug follows the name, but only changes when the name does (keeps links stable).
  const slug = body.name && body.name !== current.name ? await productSlug(body.name, id) : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { ...scalarData(body, mrp, salePrice), ...(slug ? { slug } : {}) } });
    if (body.images) await syncImages(tx, id, body.images);
    if (body.variants) await syncVariants(tx, id, body.variants);
    // Also catches removing the last image/variant of a product that stays active.
    const { isActive } = await tx.product.findUniqueOrThrow({ where: { id }, select: { isActive: true } });
    if (isActive) await assertSellable(tx, id);
  });
  return getProductOr404(id);
}

export async function setProductStatus(id: number, isActive: boolean) {
  if (isActive) await assertSellable(prisma, id);
  return prisma.product.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
}

export async function deleteProduct(id: number) {
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Product not found");
  const { softDeleted } = await deleteProducts([id]);
  return { id, deleted: softDeleted.length ? ("soft" as const) : ("hard" as const) };
}
