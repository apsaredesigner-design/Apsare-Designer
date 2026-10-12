/** Mirrors src/server/utils/pricing.ts — MRP 2499, sale 1499 -> 40 */
export function discountPercent(mrp: number, salePrice: number): number {
  if (mrp <= 0 || salePrice >= mrp) return 0;
  return Math.round(((mrp - salePrice) / mrp) * 100);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inr.format(amount || 0);
}

export const formatPrice = formatINR;
