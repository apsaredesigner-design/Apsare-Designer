import { discountPercent, formatINR } from "@/lib/pricing";

export function PriceTag({ mrp, salePrice }: { mrp: number; salePrice: number }) {
  const off = discountPercent(mrp, salePrice);
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-semibold">{formatINR(salePrice)}</span>
      {off > 0 && (
        <>
          <span className="text-sm text-ink/50 line-through">{formatINR(mrp)}</span>
          <span className="text-sm font-semibold text-sale">{off}% OFF</span>
        </>
      )}
    </div>
  );
}
