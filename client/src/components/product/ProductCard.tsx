"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useWishlist } from "@/context/WishlistContext";
import { PriceTag } from "./PriceTag";
import { Badge } from "@/components/ui/Badge";
import { FadeImage } from "@/components/store/FadeImage";
import { luxuryEase } from "@/lib/motion";
import type { ProductSummary } from "@/types";

export interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { inWishlist, toggleWishlist } = useWishlist();
  const [isWishlisting, setIsWishlisting] = useState(false);

  const isFavorited = inWishlist(product.id) || !!product.inWishlist;
  const primaryImg = product.images?.[0];
  const secondaryImg = product.images?.[1];

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisting) return;
    setIsWishlisting(true);
    try {
      await toggleWishlist(product.id);
    } finally {
      setIsWishlisting(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: luxuryEase }}
      className="group relative flex flex-col"
    >
      {/* Image container with 3:4 aspect ratio */}
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-sage-100 ring-1 ring-sage-200/60 transition-all duration-300 group-hover:ring-gold-400/40 group-hover:shadow-md"
      >
        {primaryImg?.url ? (
          <FadeImage
            src={primaryImg.url}
            alt={primaryImg.alt || product.name}
            loading={priority ? "eager" : "lazy"}
            className="object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink/40">
            No image
          </div>
        )}

        {/* Second image on hover if available */}
        {secondaryImg?.url && (
          <FadeImage
            src={secondaryImg.url}
            alt={secondaryImg.alt || product.name}
            loading={priority ? "eager" : "lazy"}
            className="object-top opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1 z-10">
          {!product.inStock ? (
            <Badge variant="ink" size="sm">
              Sold Out
            </Badge>
          ) : product.isDealOfDay ? (
            <Badge variant="sale" size="sm">
              Deal
            </Badge>
          ) : product.isBestSeller ? (
            <Badge variant="gold" size="sm">
              Best Seller
            </Badge>
          ) : product.isNewArrival ? (
            <Badge variant="sage" size="sm">
              New
            </Badge>
          ) : null}
        </div>

        {/* Wishlist Button */}
        <motion.button
          type="button"
          onClick={handleWishlistClick}
          disabled={isWishlisting}
          whileTap={{ scale: 0.85 }}
          animate={isFavorited ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          aria-label={isFavorited ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-2.5 top-2.5 z-10 rounded-full p-2 backdrop-blur-md transition-colors duration-200 cursor-pointer ${
            isFavorited
              ? "bg-white text-sale shadow-md"
              : "bg-white/80 text-ink/70 hover:bg-white hover:text-sale"
          }`}
        >
          <Heart
            className={`h-4 w-4 transition-transform ${
              isFavorited ? "fill-current scale-110" : ""
            }`}
          />
        </motion.button>

        {/* Quick view overlay bar */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-ink/60 via-ink/20 to-transparent flex justify-center">
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-white drop-shadow">
            View Details
          </span>
        </div>
      </Link>

      {/* Product metadata */}
      <div className="mt-3 flex flex-col flex-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/50 font-medium">
          {product.category?.name || product.brand}
        </span>

        <Link
          href={`/product/${product.slug}`}
          className="mt-1 font-display text-base font-medium text-ink line-clamp-1 hover:text-gold-600 transition-colors"
        >
          {product.name}
        </Link>

        <div className="mt-1.5">
          <PriceTag mrp={product.mrp} salePrice={product.salePrice} />
        </div>

        {/* Size chips preview if available */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-ink/50">
            <span>Sizes:</span>
            <span>{product.sizes.join(", ")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
