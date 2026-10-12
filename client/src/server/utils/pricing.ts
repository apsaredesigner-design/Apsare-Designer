/**
 * Admin enters only MRP and sale price; discount % is always derived.
 * e.g. MRP 2499, sale 1499 -> 40
 */
export function discountPercent(mrp: number, salePrice: number): number {
  if (mrp <= 0 || salePrice >= mrp) return 0;
  return Math.round(((mrp - salePrice) / mrp) * 100);
}
