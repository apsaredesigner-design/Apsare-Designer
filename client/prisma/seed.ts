// Dev seed: `npm run db:seed -w client`. Idempotent: everything is upserted by a
// natural key (email, slug, code, sku, title, pincode), so it is safe to re-run.
// User credentials are create-only: a re-run never resets an existing password.
import bcrypt from "bcryptjs";
import { prisma } from "../src/server/lib/prisma";
import { discountPercent } from "../src/server/utils/pricing";

const ADMIN_EMAIL = "admin@labelapsare.com";
const NODE_ENV = process.env.NODE_ENV ?? "development";
if (NODE_ENV === "production") throw new Error("Refusing to seed with NODE_ENV=production: the seed creates known demo accounts.");
if (!process.env.SEED_ADMIN_PASSWORD && NODE_ENV !== "development") {
  throw new Error(`SEED_ADMIN_PASSWORD must be set when NODE_ENV=${NODE_ENV}.`);
}
const DEV_ADMIN_PASSWORD = "Admin@12345";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? DEV_ADMIN_PASSWORD;
if (ADMIN_PASSWORD === DEV_ADMIN_PASSWORD) {
  console.warn("\n⚠️  WARNING: seeding the admin with the PUBLIC dev password. Set SEED_ADMIN_PASSWORD for anything but local dev.\n");
}
/** Same cost as client/src/server/modules/auth/auth.service.ts. */
const BCRYPT_COST = 12;
const CUSTOMER_EMAIL = "customer@labelapsare.com";
const CUSTOMER_PASSWORD = "Customer@123";

const img = (file: string) => `/images/products/${file}.jpg`;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ─── Categories ───────────────────────────────────────────────

const CATEGORIES = [
  { slug: "sarees", name: "Sarees", imageUrl: "/images/categories/sarees.jpg", description: "Handpicked silk, cotton, georgette and Banarasi sarees." },
  { slug: "silk-sarees", name: "Silk", parent: "sarees", imageUrl: img("saree-03") },
  { slug: "cotton-sarees", name: "Cotton", parent: "sarees", imageUrl: img("saree-13") },
  { slug: "georgette-sarees", name: "Georgette", parent: "sarees", imageUrl: img("saree-01") },
  { slug: "banarasi-sarees", name: "Banarasi", parent: "sarees", imageUrl: img("saree-10") },
  { slug: "blouses", name: "Blouses", imageUrl: "/images/categories/blouses.jpg", description: "Readymade and designer blouses, sizes 32 to 44." },
  { slug: "lehengas", name: "Lehengas", imageUrl: "/images/categories/lehengas.jpg", description: "Bridal and festive lehenga sets." },
  { slug: "kurta-sets", name: "Kurtas & Sets", imageUrl: "/images/categories/kurtas.jpg", description: "Everyday and festive kurtas, kurta sets and anarkalis." },
  { slug: "dupattas", name: "Dupattas", imageUrl: "/images/categories/dupattas.jpg", description: "Phulkari, Banarasi and chiffon dupattas." },
];

// ─── Products ─────────────────────────────────────────────────

type Colour = [name: string, hex: string];
interface SeedProduct {
  code: string;
  name: string;
  category: string;
  fabric: string;
  occasion: string;
  pattern: string;
  mrp: number;
  salePrice: number;
  colours: Colour[];
  images: string[];
  /** Stock per variant, cycled over size × colour. Include 0 / low numbers to exercise stock states. */
  stock: number[];
  flags?: Partial<Record<"isNewArrival" | "isTrending" | "isBestSeller" | "isDealOfDay", boolean>>;
  soldCount?: number;
  description: string;
  specs?: Record<string, string>;
}

const FREE = ["Free Size"];
const BLOUSE = ["32", "34", "36", "38", "40", "42", "44"];
const APPAREL = ["S", "M", "L", "XL", "XXL"];

const SAREE_SPECS = { "Saree length": "5.5 m", "Blouse piece": "Yes, unstitched (0.8 m)", "Wash care": "Dry clean only" };
const sareeCare = "Dry clean only. Store folded in a muslin cloth, away from direct sunlight.";

const PRODUCTS: SeedProduct[] = [
  // Silk
  {
    code: "APS-SAR-001", name: "Kanjivaram Silk Saree with Temple Border", category: "silk-sarees",
    fabric: "Pure Kanjivaram Silk", occasion: "Wedding", pattern: "Woven Zari", mrp: 18999, salePrice: 14999,
    colours: [["Maroon", "#7B1E2B"]], images: ["saree-03", "fabric-02", "saree-04"], stock: [6],
    flags: { isBestSeller: true, isTrending: true }, soldCount: 142,
    description: "A handwoven Kanjivaram in deep maroon with a classic temple border and a rich zari pallu. Made for wedding mornings and family heirlooms.",
    specs: { ...SAREE_SPECS, Work: "Zari weave" },
  },
  {
    code: "APS-SAR-002", name: "Mysore Crepe Silk Saree", category: "silk-sarees",
    fabric: "Crepe Silk", occasion: "Festive", pattern: "Solid", mrp: 7499, salePrice: 5999,
    colours: [["Purple", "#5B2A6E"], ["Bottle Green", "#1F4D3A"]], images: ["saree-02", "fabric-01"], stock: [8, 2],
    flags: { isNewArrival: true }, soldCount: 38,
    description: "Feather-light Mysore crepe silk with a slim gold border. Drapes softly and keeps its fall all day.",
    specs: { ...SAREE_SPECS, Work: "Zari border" },
  },
  {
    code: "APS-SAR-003", name: "Soft Silk Saree with Contrast Pallu", category: "silk-sarees",
    fabric: "Soft Silk", occasion: "Festive", pattern: "Contrast Pallu", mrp: 5999, salePrice: 3999,
    colours: [["Green", "#2E6B3F"]], images: ["saree-14", "saree-06"], stock: [12],
    flags: { isDealOfDay: true }, soldCount: 96,
    description: "A soft silk saree in forest green with a contrasting woven pallu. Easy to drape and easy to carry.",
    specs: { ...SAREE_SPECS, Work: "Woven pallu" },
  },
  {
    code: "APS-SAR-004", name: "Tussar Silk Saree with Kalamkari Print", category: "silk-sarees",
    fabric: "Tussar Silk", occasion: "Office Wear", pattern: "Kalamkari Print", mrp: 6499, salePrice: 4999,
    colours: [["Mustard", "#C9962B"]], images: ["saree-05", "fabric-03"], stock: [0],
    soldCount: 21,
    description: "Natural tussar silk hand-printed with Kalamkari motifs. Understated texture for workdays and gallery evenings.",
    specs: { ...SAREE_SPECS, Work: "Hand block print" },
  },
  // Cotton
  {
    code: "APS-SAR-005", name: "Handloom Chanderi Cotton Saree", category: "cotton-sarees",
    fabric: "Chanderi Cotton", occasion: "Office Wear", pattern: "Butti", mrp: 2999, salePrice: 2199,
    colours: [["Ivory", "#F3EBD8"], ["Powder Blue", "#A7C4DD"]], images: ["saree-13", "saree-07"], stock: [15, 3],
    flags: { isNewArrival: true }, soldCount: 64,
    description: "Sheer handloom Chanderi with delicate gold buttis. Breathable and elegant for long summer days.",
    specs: { ...SAREE_SPECS, "Wash care": "Hand wash cold, dry in shade", Work: "Woven butti" },
  },
  {
    code: "APS-SAR-006", name: "Sambalpuri Ikat Cotton Saree", category: "cotton-sarees",
    fabric: "Cotton", occasion: "Casual", pattern: "Ikat", mrp: 3499, salePrice: 2799,
    colours: [["Red", "#A4262C"]], images: ["saree-08", "fabric-03"], stock: [9],
    flags: { isTrending: true }, soldCount: 57,
    description: "Traditional Sambalpuri ikat woven by Odisha weavers, with tie-dyed motifs on body and pallu.",
    specs: { ...SAREE_SPECS, "Wash care": "Hand wash cold, dry in shade", Work: "Ikat weave" },
  },
  {
    code: "APS-SAR-007", name: "Mulmul Cotton Saree with Block Print", category: "cotton-sarees",
    fabric: "Mulmul Cotton", occasion: "Casual", pattern: "Block Print", mrp: 1899, salePrice: 1299,
    colours: [["Indigo", "#2F4F8F"]], images: ["saree-11", "saree-05"], stock: [2],
    flags: { isDealOfDay: true }, soldCount: 188,
    description: "Buttery-soft mulmul cotton with hand block prints. The everyday saree you will reach for first.",
    specs: { ...SAREE_SPECS, "Wash care": "Hand wash cold, dry in shade", Work: "Hand block print" },
  },
  // Georgette
  {
    code: "APS-SAR-008", name: "Sequinned Georgette Party Saree", category: "georgette-sarees",
    fabric: "Georgette", occasion: "Party", pattern: "Sequinned", mrp: 6999, salePrice: 4899,
    colours: [["Wine", "#722F37"], ["Black", "#1B1B18"]], images: ["saree-01", "saree-09"], stock: [7, 0],
    flags: { isTrending: true }, soldCount: 73,
    description: "Flowing georgette scattered with tonal sequins for cocktail nights and receptions.",
    specs: { ...SAREE_SPECS, Work: "Sequin embroidery" },
  },
  {
    code: "APS-SAR-009", name: "Printed Georgette Saree with Lace Border", category: "georgette-sarees",
    fabric: "Georgette", occasion: "Casual", pattern: "Floral Print", mrp: 2499, salePrice: 1749,
    colours: [["Peach", "#F4B393"]], images: ["saree-09", "saree-12"], stock: [20],
    soldCount: 45,
    description: "A lightweight floral georgette finished with a delicate lace border. Travel-friendly and wrinkle resistant.",
    specs: { ...SAREE_SPECS, "Wash care": "Gentle hand wash", Work: "Lace border" },
  },
  {
    code: "APS-SAR-010", name: "Ombre Georgette Saree", category: "georgette-sarees",
    fabric: "Georgette", occasion: "Festive", pattern: "Ombre", mrp: 3999, salePrice: 3199,
    colours: [["Teal", "#2A7F7F"]], images: ["saree-06", "fabric-01"], stock: [4],
    flags: { isNewArrival: true }, soldCount: 12,
    description: "A teal-to-sea-green ombre georgette with a fine gota edge.",
    specs: { ...SAREE_SPECS, Work: "Gota patti edge" },
  },
  // Banarasi
  {
    code: "APS-SAR-011", name: "Banarasi Katan Silk Saree with Zari Buta", category: "banarasi-sarees",
    fabric: "Katan Silk", occasion: "Wedding", pattern: "Zari Buta", mrp: 21999, salePrice: 17999,
    colours: [["Red", "#B22222"]], images: ["saree-10", "fabric-05", "fabric-04"], stock: [5],
    flags: { isBestSeller: true }, soldCount: 119,
    description: "Pure katan silk from Varanasi woven with gold zari butas and a heavy kadhwa pallu. A bridal classic.",
    specs: { ...SAREE_SPECS, Work: "Kadhwa zari weave", "Silk Mark": "Certified" },
  },
  {
    code: "APS-SAR-012", name: "Banarasi Organza Saree", category: "banarasi-sarees",
    fabric: "Organza", occasion: "Festive", pattern: "Floral Jaal", mrp: 8999, salePrice: 6299,
    colours: [["Blush Pink", "#E7A1B0"]], images: ["saree-12", "saree-02"], stock: [3],
    flags: { isNewArrival: true, isTrending: true }, soldCount: 51,
    description: "Sheer Banarasi organza with a woven floral jaal in silver zari.",
    specs: { ...SAREE_SPECS, Work: "Zari jaal" },
  },
  {
    code: "APS-SAR-013", name: "Banarasi Georgette Saree with Meenakari Weave", category: "banarasi-sarees",
    fabric: "Georgette", occasion: "Wedding", pattern: "Meenakari", mrp: 9999, salePrice: 7999,
    colours: [["Emerald", "#1F6E4E"]], images: ["saree-14", "fabric-02"], stock: [10],
    flags: { isDealOfDay: true }, soldCount: 34,
    description: "Banarasi georgette with colourful meenakari motifs woven across the body and pallu.",
    specs: { ...SAREE_SPECS, Work: "Meenakari weave" },
  },
  // Blouses
  {
    code: "APS-BLS-001", name: "Zari Brocade Readymade Blouse", category: "blouses",
    fabric: "Brocade", occasion: "Wedding", pattern: "Brocade", mrp: 2499, salePrice: 1799,
    colours: [["Gold", "#C4A052"]], images: ["fabric-04", "fabric-05"], stock: [4, 8, 10, 6, 2, 0, 1],
    flags: { isBestSeller: true }, soldCount: 88,
    description: "A fully lined brocade blouse with elbow sleeves and a deep back. Pairs with any silk saree.",
    specs: { Sleeves: "Elbow length", Padding: "Padded", Closure: "Front hooks", Lining: "Cotton" },
  },
  {
    code: "APS-BLS-002", name: "Embroidered Raw Silk Blouse", category: "blouses",
    fabric: "Raw Silk", occasion: "Festive", pattern: "Embroidered", mrp: 1999, salePrice: 1499,
    colours: [["Maroon", "#7B1E2B"]], images: ["fabric-06", "fabric-02"], stock: [3, 5, 5, 4, 0, 2, 0],
    flags: { isNewArrival: true }, soldCount: 26,
    description: "Raw silk blouse with hand-done zardozi on the sleeves and neckline.",
    specs: { Sleeves: "Short", Padding: "Non-padded", Closure: "Back hooks", Lining: "Cotton" },
  },
  {
    code: "APS-BLS-003", name: "Cotton Sleeveless Blouse", category: "blouses",
    fabric: "Cotton", occasion: "Casual", pattern: "Solid", mrp: 999, salePrice: 749,
    colours: [["Teal", "#2A7F7F"], ["Black", "#1B1B18"]], images: ["fabric-01", "fabric-03"], stock: [10, 12, 0, 9, 7, 3, 2],
    soldCount: 61,
    description: "A breathable cotton sleeveless blouse with a sweetheart neck. A wardrobe staple.",
    specs: { Sleeves: "Sleeveless", Padding: "Non-padded", Closure: "Front hooks", Lining: "None" },
  },
  // Lehengas
  {
    code: "APS-LHG-001", name: "Bridal Velvet Lehenga with Zardozi Work", category: "lehengas",
    fabric: "Velvet", occasion: "Bridal", pattern: "Zardozi", mrp: 64999, salePrice: 52999,
    colours: [["Red", "#9E1B1B"]], images: ["lehenga-01", "lehenga-02", "fabric-06"], stock: [1, 2, 2, 1, 0],
    flags: { isBestSeller: true }, soldCount: 17,
    description: "Hand-embroidered velvet bridal lehenga with zardozi and dabka work, a matching blouse and a net dupatta.",
    specs: { Set: "Lehenga, blouse, dupatta", Flare: "4.5 m", Blouse: "Unstitched", "Wash care": "Dry clean only" },
  },
  {
    code: "APS-LHG-002", name: "Pastel Organza Lehenga Set", category: "lehengas",
    fabric: "Organza", occasion: "Wedding Guest", pattern: "Floral Embroidery", mrp: 24999, salePrice: 18999,
    colours: [["Blush Pink", "#E7A1B0"]], images: ["lehenga-05", "lehenga-04"], stock: [3, 5, 4, 2, 1],
    flags: { isNewArrival: true, isTrending: true }, soldCount: 29,
    description: "A pastel organza lehenga with threadwork florals and a scalloped dupatta. Made for day weddings.",
    specs: { Set: "Lehenga, blouse, dupatta", Flare: "3.5 m", Blouse: "Semi-stitched", "Wash care": "Dry clean only" },
  },
  {
    code: "APS-LHG-003", name: "Georgette Anarkali Lehenga", category: "lehengas",
    fabric: "Georgette", occasion: "Sangeet", pattern: "Embroidered", mrp: 14999, salePrice: 11999,
    colours: [["Wine", "#722F37"]], images: ["lehenga-06", "lehenga-03", "lehenga-07"], stock: [4, 6, 0, 3, 2],
    soldCount: 22,
    description: "Flowing georgette lehenga with an anarkali-style bodice and a sheer embroidered dupatta.",
    specs: { Set: "Lehenga, blouse, dupatta", Flare: "4 m", Blouse: "Stitched", "Wash care": "Dry clean only" },
  },
  // Kurtas & sets
  {
    code: "APS-KRT-001", name: "Floral Printed Cotton Kurta Set", category: "kurta-sets",
    fabric: "Cotton", occasion: "Casual", pattern: "Floral Print", mrp: 2999, salePrice: 1999,
    colours: [["Pink", "#E58FA8"]], images: ["kurta-01", "kurta-04"], stock: [8, 12, 10, 6, 2],
    flags: { isNewArrival: true }, soldCount: 81,
    description: "A straight cotton kurta with matching pants in a soft floral print.",
    specs: { Set: "Kurta, pants", Length: "Calf length", Sleeves: "Three-quarter", "Wash care": "Machine wash cold" },
  },
  {
    code: "APS-KRT-002", name: "Chikankari Kurta with Palazzo", category: "kurta-sets",
    fabric: "Georgette", occasion: "Festive", pattern: "Chikankari", mrp: 4499, salePrice: 3599,
    colours: [["White", "#F7F5EF"]], images: ["kurta-06", "kurta-03"], stock: [5, 7, 0, 4, 1],
    flags: { isTrending: true }, soldCount: 49,
    description: "Lucknowi chikankari on georgette with a flared palazzo and a cotton slip.",
    specs: { Set: "Kurta, palazzo, slip", Length: "Knee length", Sleeves: "Full", "Wash care": "Gentle hand wash" },
  },
  {
    code: "APS-KRT-003", name: "Anarkali Kurta with Embroidered Yoke", category: "kurta-sets",
    fabric: "Rayon", occasion: "Festive", pattern: "Embroidered", mrp: 3499, salePrice: 2299,
    colours: [["Yellow", "#E8B930"]], images: ["kurta-07", "kurta-05", "kurta-02"], stock: [6, 9, 9, 5, 3],
    flags: { isDealOfDay: true }, soldCount: 103,
    description: "A tiered anarkali kurta with a colourful threadwork yoke. Twirl-ready for haldi and mehendi.",
    specs: { Length: "Ankle length", Sleeves: "Three-quarter", "Wash care": "Hand wash cold" },
  },
  // Dupattas
  {
    code: "APS-DUP-001", name: "Phulkari Embroidered Dupatta", category: "dupattas",
    fabric: "Chiffon", occasion: "Festive", pattern: "Phulkari", mrp: 1999, salePrice: 1499,
    colours: [["Multicolour", "#D9534F"]], images: ["dupatta-01", "fabric-03"], stock: [14],
    soldCount: 58,
    description: "Bright Punjabi phulkari embroidery on a soft chiffon base.",
    specs: { Length: "2.25 m", Width: "1 m", "Wash care": "Dry clean only" },
  },
  {
    code: "APS-DUP-002", name: "Banarasi Silk Dupatta", category: "dupattas",
    fabric: "Silk", occasion: "Wedding", pattern: "Zari Border", mrp: 3499, salePrice: 2799,
    colours: [["Black", "#1B1B18"], ["Red", "#B22222"]], images: ["dupatta-02", "fabric-05"], stock: [2, 0],
    flags: { isBestSeller: true }, soldCount: 67,
    description: "A Banarasi silk dupatta with a heavy zari border to lift any plain kurta set.",
    specs: { Length: "2.5 m", Width: "1 m", "Wash care": "Dry clean only" },
  },
];

function sizesFor(category: string): string[] {
  if (category === "blouses") return BLOUSE;
  if (category === "lehengas" || category === "kurta-sets") return APPAREL;
  return FREE;
}

const code = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6);

// ─── Seeders ──────────────────────────────────────────────────

async function seedUsers() {
  const [adminHash, customerHash] = await Promise.all([bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST), bcrypt.hash(CUSTOMER_PASSWORD, BCRYPT_COST)]);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN", isActive: true }, // never overwrite an existing password
    create: { fullName: "Apsáre Admin", email: ADMIN_EMAIL, mobile: "9000000001", passwordHash: adminHash, role: "ADMIN" },
  });

  const customer = await prisma.user.upsert({
    where: { email: CUSTOMER_EMAIL },
    update: { isActive: true },
    create: { fullName: "Ananya Rao", email: CUSTOMER_EMAIL, mobile: "9876543210", passwordHash: customerHash },
  });

  if (!(await prisma.address.count({ where: { userId: customer.id } }))) {
    await prisma.address.create({
      data: {
        userId: customer.id, fullName: "Ananya Rao", mobile: "9876543210", line1: "12, 4th Cross, Indiranagar",
        landmark: "Near CMH Road Metro", city: "Bengaluru", state: "Karnataka", pincode: "560038", isDefault: true,
      },
    });
  }
}

async function seedCategories() {
  const ids = new Map<string, number>();
  for (const [sortOrder, c] of CATEGORIES.entries()) {
    const data = {
      name: c.name,
      imageUrl: c.imageUrl,
      description: c.description ?? null,
      parentId: c.parent ? ids.get(c.parent)! : null,
      sortOrder,
      isActive: true,
    };
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: data, create: { slug: c.slug, ...data } });
    ids.set(c.slug, row.id);
  }
  return ids;
}

async function seedProducts(categoryIds: Map<string, number>) {
  for (const p of PRODUCTS) {
    const data = {
      name: p.name,
      slug: slugify(p.name),
      description: p.description,
      categoryId: categoryIds.get(p.category)!,
      fabric: p.fabric,
      occasion: p.occasion,
      pattern: p.pattern,
      careInstructions: p.category.endsWith("sarees") ? sareeCare : null,
      specs: { Fabric: p.fabric, Occasion: p.occasion, ...p.specs },
      mrp: p.mrp,
      salePrice: p.salePrice,
      discountPercent: discountPercent(p.mrp, p.salePrice),
      isActive: true,
      isNewArrival: false,
      isTrending: false,
      isBestSeller: false,
      isDealOfDay: false,
      ...p.flags,
      soldCount: p.soldCount ?? 0,
    };
    const images = p.images.map((file, sortOrder) => ({ url: img(file), alt: p.name, sortOrder }));

    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: { ...data, images: { deleteMany: {}, create: images } },
      create: { code: p.code, ...data, images: { create: images } },
    });

    let i = 0;
    for (const size of sizesFor(p.category)) {
      for (const [color, colorHex] of p.colours) {
        const stock = p.stock[i++ % p.stock.length];
        await prisma.productVariant.upsert({
          where: { productId_size_color: { productId: product.id, size, color } },
          update: { colorHex, stock },
          create: { productId: product.id, sku: `${p.code}-${code(size)}-${code(color)}`, size, color, colorHex, stock },
        });
      }
    }
  }
}

async function seedStorefront() {
  const days = (n: number) => new Date(Date.now() + n * 86_400_000);
  const coupons = [
    { code: "WELCOME10", description: "10% off your first order (up to ₹500)", type: "PERCENT", value: 10, maxDiscount: 500, minOrderAmount: 999, firstOrderOnly: true },
    { code: "FLAT500", description: "₹500 off on orders above ₹4,999", type: "FLAT", value: 500, maxDiscount: null, minOrderAmount: 4999 },
    { code: "FESTIVE20", description: "Festive sale: 20% off (up to ₹2,000)", type: "PERCENT", value: 20, maxDiscount: 2000, minOrderAmount: 2999, expiresAt: days(60), usageLimit: 500 },
    { code: "EXPIRED15", description: "Expired coupon for testing", type: "PERCENT", value: 15, maxDiscount: 1000, minOrderAmount: 0, expiresAt: days(-1) },
  ] as const;
  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, update: c, create: c });
  }

  const banners = [
    { title: "The Bridal Edit", subtitle: "Heirloom lehengas and Banarasi silks for your big day", imageUrl: "/images/banners/banner-bridal.jpg", ctaLabel: "Shop Bridal", ctaHref: "/category/lehengas" },
    { title: "Drapes of Grace", subtitle: "New season sarees, handpicked from India's looms", imageUrl: "/images/banners/banner-saree.jpg", ctaLabel: "Shop Sarees", ctaHref: "/category/sarees" },
    { title: "Festive Sale: up to 40% off", subtitle: "Use code FESTIVE20 for an extra 20% off", imageUrl: "/images/banners/banner-festive.jpg", ctaLabel: "Shop Offers", ctaHref: "/offers" },
  ];
  for (const [sortOrder, b] of banners.entries()) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    const data = { ...b, sortOrder, isActive: true };
    if (existing) await prisma.banner.update({ where: { id: existing.id }, data });
    else await prisma.banner.create({ data });
  }

  const pincodes = [
    ["560001", 2, true], ["560038", 2, true], ["400001", 3, true], ["110001", 4, true],
    ["600001", 3, true], ["700001", 5, true], ["500001", 3, true], ["575001", 4, true], ["791001", 8, false], ["560041", 2, true],
  ] as const;
  for (const [pincode, deliveryDays, codAvailable] of pincodes) {
    await prisma.serviceablePincode.upsert({ where: { pincode }, update: { deliveryDays, codAvailable }, create: { pincode, deliveryDays, codAvailable } });
  }

  await prisma.storeSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1, deliveryCharge: 99, freeShippingThreshold: 1999, codFee: 0 } });
}

async function main() {
  await seedUsers();
  const categoryIds = await seedCategories();
  await seedProducts(categoryIds);
  await seedStorefront();

  const [products, variants, outOfStock] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.productVariant.count({ where: { stock: 0 } }),
  ]);
  console.log(`Seeded ${CATEGORIES.length} categories, ${products} products, ${variants} variants (${outOfStock} out of stock).`);
  console.log(`Admin: ${ADMIN_EMAIL} (password from SEED_ADMIN_PASSWORD on first seed) · Customer: ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
