// Test data straight through Prisma (fast, and independent of the endpoints under test).
import bcrypt from "bcryptjs";
import type { CouponType, Role } from "../../src/generated/prisma/client";
import { db } from "./db";

let seq = 0;
const run = Math.floor(Math.random() * 1e5);
/** Unique-per-run suffix for codes, slugs, SKUs and emails. */
export const uid = (prefix = "t") => `${prefix}${run}x${++seq}`;

// ─── Users ───────────────────────────────────────────────────────

export const TEST_PASSWORD = "Passw0rd1";
/** Hashed once at a low cost: bcrypt.compare works with any cost, so logins stay fast. */
const cheapHash = bcrypt.hashSync(TEST_PASSWORD, 4);
let mobileSeq = 0;
const mobile = () => `9${String(run).padStart(5, "0")}${String(++mobileSeq).padStart(4, "0")}`;

export async function createUser(opts: { role?: Role; isActive?: boolean; fullName?: string } = {}) {
  const email = `${uid("user")}@example.com`;
  const user = await db.user.create({
    data: { fullName: opts.fullName ?? "Test Buyer", email, mobile: mobile(), passwordHash: cheapHash, role: opts.role ?? "CUSTOMER", isActive: opts.isActive ?? true },
  });
  return { ...user, password: TEST_PASSWORD };
}

export async function createAddress(userId: number, opts: { pincode?: string; isDefault?: boolean } = {}) {
  return db.address.create({
    data: {
      userId, fullName: "Test Buyer", mobile: "9876543210", line1: "1 Test St", city: "Bengaluru", state: "Karnataka",
      pincode: opts.pincode ?? "560038", isDefault: opts.isDefault ?? true,
    },
  });
}

// ─── Catalog ─────────────────────────────────────────────────────

export async function createCategory(opts: { parentId?: number | null; isActive?: boolean; name?: string } = {}) {
  const slug = uid("cat-");
  return db.category.create({ data: { name: opts.name ?? `Category ${slug}`, slug, parentId: opts.parentId ?? null, isActive: opts.isActive ?? true } });
}

let defaultCategoryId: number | undefined;
async function defaultCategory() {
  defaultCategoryId ??= (await createCategory({ name: "Test Garments" })).id;
  return defaultCategoryId;
}

export interface VariantSpec {
  size?: string;
  color?: string;
  colorHex?: string | null;
  stock?: number;
}

export async function createVariant(productId: number, spec: VariantSpec = {}) {
  return db.productVariant.create({
    data: { productId, sku: uid("SKU-"), size: spec.size ?? "M", color: spec.color ?? uid("Colour"), colorHex: spec.colorHex ?? null, stock: spec.stock ?? 10 },
  });
}

export interface ProductSpec {
  name?: string;
  code?: string;
  categoryId?: number;
  mrp?: number;
  salePrice?: number;
  isActive?: boolean;
  fabric?: string | null;
  occasion?: string | null;
  soldCount?: number;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isDealOfDay?: boolean;
  /** Default: one variant (M, 10 in stock). Pass [] for none. */
  variants?: VariantSpec[];
  /** Number of images (default 1). */
  images?: number;
}

export async function createProduct(spec: ProductSpec = {}) {
  const code = spec.code ?? uid("TST-");
  const mrp = spec.mrp ?? 2000;
  const salePrice = spec.salePrice ?? 1500;
  const name = spec.name ?? `Test Product ${code}`;
  const product = await db.product.create({
    data: {
      code, name, slug: code.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: `Description of ${name}`,
      categoryId: spec.categoryId ?? (await defaultCategory()),
      fabric: spec.fabric ?? null, occasion: spec.occasion ?? null,
      mrp, salePrice, discountPercent: Math.floor(((mrp - salePrice) / mrp) * 100),
      isActive: spec.isActive ?? true, soldCount: spec.soldCount ?? 0,
      isNewArrival: spec.isNewArrival ?? false, isTrending: spec.isTrending ?? false,
      isBestSeller: spec.isBestSeller ?? false, isDealOfDay: spec.isDealOfDay ?? false,
      images: { create: Array.from({ length: spec.images ?? 1 }, (_, i) => ({ url: `/images/test/${code}-${i}.jpg`, alt: name, sortOrder: i })) },
    },
  });
  const variants = [];
  for (const v of spec.variants ?? [{}]) variants.push(await createVariant(product.id, v));
  return { ...product, variants };
}

export async function createCoupon(opts: {
  code?: string; type?: CouponType; value?: number; maxDiscount?: number | null; minOrderAmount?: number;
  usageLimit?: number | null; perUserLimit?: number | null; firstOrderOnly?: boolean;
  startsAt?: Date | null; expiresAt?: Date | null; isActive?: boolean;
} = {}) {
  return db.coupon.create({
    data: {
      code: opts.code ?? uid("CPN").toUpperCase(), description: "Test coupon", type: opts.type ?? "FLAT", value: opts.value ?? 100,
      maxDiscount: opts.maxDiscount ?? null, minOrderAmount: opts.minOrderAmount ?? 0, usageLimit: opts.usageLimit ?? null,
      perUserLimit: opts.perUserLimit ?? null, firstOrderOnly: opts.firstOrderOnly ?? false,
      startsAt: opts.startsAt ?? null, expiresAt: opts.expiresAt ?? null, isActive: opts.isActive ?? true,
    },
  });
}

export const stockOf = async (variantId: number) => (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;
