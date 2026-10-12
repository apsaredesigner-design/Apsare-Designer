/**
 * Product form model: editable values, conversion to/from the API shape and
 * client-side validation. Error keys use the server's field paths ("code",
 * "salePrice", "variants.2.sku", "specs.1.key") so client and server errors
 * render in the same places.
 */
import type { UploaderImage } from "@/components/admin/ImageUploader";
import { PRODUCT_FLAGS, PRODUCT_LIMITS, type ProductFlag } from "@/lib/admin/helpers/products";
import type { AdminProduct, AdminProductInput } from "@/lib/admin/types";

export interface VariantRow {
  key: string;
  id?: number;
  size: string;
  color: string;
  colorHex: string;
  sku: string;
  /** True once the admin typed a SKU; otherwise it follows code-size-colour. */
  skuEdited: boolean;
  stock: string;
}

export interface SpecRow {
  key: string;
  name: string;
  value: string;
}

export interface ProductValues {
  code: string;
  name: string;
  brand: string;
  categoryId: string;
  description: string;
  fabric: string;
  occasion: string;
  pattern: string;
  careInstructions: string;
  mrp: string;
  salePrice: string;
  images: UploaderImage[];
  variants: VariantRow[];
  specs: SpecRow[];
  flags: Record<ProductFlag, boolean>;
}

export type FormErrors = Record<string, string>;

let seq = 0;
export const rowKey = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Every numeric field in this form is a whole number. Drops grouping commas and
 * anything after a decimal point ("₹4,999.50" → "4999") rather than gluing the
 * fraction on (which would turn 3999.5 into 39995).
 */
export const digits = (v: string) => v.replace(/,/g, "").split(".")[0].replace(/\D/g, "").slice(0, 8);

const SKU_UNSAFE = /[^A-Za-z0-9._-]+/g;
const SKU_OK = /^[A-Za-z0-9._-]+$/;
export function suggestSku(code: string, size: string, color: string): string {
  return [code, size, color]
    .map((p) => p.trim().replace(/\s+/g, "").replace(SKU_UNSAFE, "").toUpperCase())
    .filter(Boolean)
    .join("-")
    .slice(0, 64);
}

const NAMED_HEX: Record<string, string> = {
  black: "#1B1B18", white: "#FFFFFF", ivory: "#FBF9F3", cream: "#F3E9D2", red: "#B22222", maroon: "#800000",
  pink: "#E8A0B4", rose: "#C97B84", orange: "#E07B39", yellow: "#E8C547", mustard: "#C9A227", gold: "#C4A052",
  green: "#2E7D32", sage: "#9DAB78", olive: "#6B7A3A", teal: "#1F7A7A", blue: "#1F4E99", navy: "#1B2A4A",
  purple: "#6A3D9A", lavender: "#B8A1D9", wine: "#722F37", peach: "#F2B8A0", beige: "#D8C3A5", grey: "#8A8A8A",
  gray: "#8A8A8A", silver: "#C0C0C0", brown: "#6D4C41", magenta: "#B0306A",
};
export const guessHex = (color: string) => NAMED_HEX[color.trim().toLowerCase()] ?? "";

export function newVariant(code: string, size: string, color: string): VariantRow {
  return { key: rowKey(), size, color, colorHex: guessHex(color), sku: suggestSku(code, size, color), skuEdited: false, stock: "0" };
}

export const emptyValues = (): ProductValues => ({
  code: "",
  name: "",
  brand: "Label Apsáre",
  categoryId: "",
  description: "",
  fabric: "",
  occasion: "",
  pattern: "",
  careInstructions: "",
  mrp: "",
  salePrice: "",
  images: [],
  variants: [],
  specs: [],
  flags: { isNewArrival: false, isTrending: false, isBestSeller: false, isDealOfDay: false },
});

export function fromProduct(p: AdminProduct): ProductValues {
  return {
    code: p.code,
    name: p.name,
    brand: p.brand,
    categoryId: String(p.categoryId),
    description: p.description,
    fabric: p.fabric ?? "",
    occasion: p.occasion ?? "",
    pattern: p.pattern ?? "",
    careInstructions: p.careInstructions ?? "",
    mrp: String(Math.round(p.mrp)),
    salePrice: String(Math.round(p.salePrice)),
    images: p.images.map((img) => ({ id: img.id, url: img.url, publicId: img.publicId, alt: img.alt ?? "" })),
    variants: p.variants.map((v) => ({
      key: rowKey(),
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex ?? "",
      sku: v.sku,
      skuEdited: v.sku !== suggestSku(p.code, v.size, v.color),
      stock: String(v.stock),
    })),
    specs: Object.entries(p.specs ?? {}).map(([name, value]) => ({ key: rowKey(), name, value })),
    flags: Object.fromEntries(PRODUCT_FLAGS.map((f) => [f, p[f]])) as Record<ProductFlag, boolean>,
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const int = (v: string) => (v === "" ? Number.NaN : Number(v));

export function toInput(v: ProductValues, isActive: boolean): AdminProductInput {
  const specs = v.specs.filter((s) => s.name.trim());
  return {
    code: v.code.trim(),
    name: v.name.trim(),
    brand: v.brand.trim() || undefined,
    categoryId: int(v.categoryId),
    description: v.description.trim(),
    fabric: orNull(v.fabric),
    occasion: orNull(v.occasion),
    pattern: orNull(v.pattern),
    careInstructions: orNull(v.careInstructions),
    specs: specs.length ? Object.fromEntries(specs.map((s) => [s.name.trim(), s.value.trim()])) : null,
    mrp: int(v.mrp),
    salePrice: int(v.salePrice),
    isActive,
    ...v.flags,
    images: v.images.map((img, i) => ({ url: img.url, publicId: img.publicId, alt: orNull(img.alt ?? ""), sortOrder: i })),
    variants: v.variants.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      sku: r.sku.trim(),
      size: r.size.trim(),
      color: r.color.trim(),
      colorHex: r.colorHex || null,
      stock: int(r.stock),
    })),
  };
}

/** Stable fingerprint for dirty checking (ignores row keys and the active flag). */
export const fingerprint = (v: ProductValues) => JSON.stringify(toInput(v, false));

export function validate(v: ProductValues, publish: boolean): FormErrors {
  const e: FormErrors = {};
  if (!v.name.trim()) e.name = "Enter a product name";
  else if (v.name.trim().length < 2) e.name = "At least 2 characters";
  if (!v.code.trim()) e.code = "Enter a product code";
  if (!v.categoryId) e.categoryId = "Choose a category";
  if (!v.description.trim()) e.description = "Add a description";

  const mrp = int(v.mrp);
  const sale = int(v.salePrice);
  if (!(mrp > 0)) e.mrp = "Enter an MRP above ₹0";
  if (!(sale > 0)) e.salePrice = "Enter a sale price above ₹0";
  else if (mrp > 0 && sale > mrp) e.salePrice = "Sale price cannot exceed MRP";

  const skus = new Set<string>();
  const combos = new Set<string>();
  v.variants.forEach((r, i) => {
    if (!r.size.trim()) e[`variants.${i}.size`] = "Required";
    if (!r.color.trim()) e[`variants.${i}.color`] = "Required";
    if (!r.sku.trim()) e[`variants.${i}.sku`] = "Required";
    else if (!SKU_OK.test(r.sku.trim())) e[`variants.${i}.sku`] = "Letters, digits, . _ - only";
    else if (skus.has(r.sku.trim().toUpperCase())) e[`variants.${i}.sku`] = "Duplicate SKU";
    if (r.stock === "") e[`variants.${i}.stock`] = "Required";
    const combo = `${r.size.trim().toLowerCase()}|${r.color.trim().toLowerCase()}`;
    if (combos.has(combo)) e[`variants.${i}`] = "Duplicate size + colour";
    skus.add(r.sku.trim().toUpperCase());
    combos.add(combo);
  });

  const names = new Set<string>();
  v.specs.forEach((s, i) => {
    const name = s.name.trim();
    if (!name && s.value.trim()) e[`specs.${i}.key`] = "Add a name or remove the row";
    if (name && names.has(name.toLowerCase())) e[`specs.${i}.key`] = "Duplicate spec";
    names.add(name.toLowerCase());
  });
  if (v.specs.length > PRODUCT_LIMITS.specs) e.specs = `At most ${PRODUCT_LIMITS.specs} specs`;

  if (publish) {
    if (v.images.length === 0) e.images = "Add at least one image to publish";
    if (v.variants.length === 0) e.variants = "Add at least one variant to publish";
  }
  return e;
}
