import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCardSkeleton } from "@/components/product/ProductCardSkeleton";

export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 animate-pulse">
      {/* Skeleton header */}
      <div className="border-b border-sage-200 pb-6 mb-8">
        <Skeleton variant="text" className="h-4 w-28 mb-2" />
        <Skeleton variant="text" className="h-8 w-64" />
      </div>

      {/* Skeleton product rail / grid — matches ProductListing's own grid so real cards don't jump. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-3 gap-y-8 sm:gap-6">
        {Array.from({ length: 9 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
