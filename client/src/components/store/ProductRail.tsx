"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { ProductCard } from "@/components/product/ProductCard";
import { staggerContainer, staggerItem, luxuryEase } from "@/lib/motion";
import { useScrollArrows } from "@/lib/useScrollArrows";
import type { ProductSummary } from "@/types";

export interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: ProductSummary[];
  viewAllHref?: string;
  className?: string;
  /** How many of the leading cards to render eagerly (above-the-fold rails only, e.g. the first home page rail). */
  priorityCount?: number;
}

export function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
  className = "",
  priorityCount = 0,
}: ProductRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollBy } = useScrollArrows(scrollerRef);

  // Hide rail if empty per specification. Below the hooks above: hooks must run on every
  // render regardless of this early return (Rules of Hooks).
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className={`py-12 sm:py-16 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: luxuryEase }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-sage-200/80 pb-4 mb-8"
        >
          <div>
            {subtitle && (
              <p className="text-[11px] uppercase tracking-[0.25em] text-gold-600 font-semibold mb-1">
                {subtitle}
              </p>
            )}
            <h2 className="font-display text-2xl font-semibold tracking-wide text-ink sm:text-3xl md:text-4xl">
              {title}
            </h2>
          </div>

          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-medium text-ink/70 hover:text-gold-600 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </motion.div>

        {/* Horizontal scroll carousel instead of a wrapping grid: any product count (an odd
            5, 6, 7...) would otherwise leave a lone card stranded alone on the last row at
            some breakpoint. Card widths approximate the old 2/3/4-column breakpoints, with a
            deliberate partial peek of the next card as a scrollability affordance. Arrow
            buttons (desktop only) make the scroll discoverable even when a row's cards
            happen to fit exactly, where drag/swipe is the only other way to tell. */}
        <div className="relative">
          <motion.div
            ref={scrollerRef}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:gap-6 sm:px-6"
          >
            {products.slice(0, 8).map((product, idx) => (
              <motion.div
                key={product.id}
                variants={staggerItem}
                className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%]"
              >
                <ProductCard product={product} priority={idx < priorityCount} />
              </motion.div>
            ))}
          </motion.div>

          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll to previous products"
              className="absolute -left-1 top-[38%] hidden -translate-y-1/2 rounded-full border border-sage-200 bg-ivory/95 p-2.5 text-ink shadow-md transition hover:bg-ivory cursor-pointer sm:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll to more products"
              className="absolute -right-1 top-[38%] hidden -translate-y-1/2 rounded-full border border-sage-200 bg-ivory/95 p-2.5 text-ink shadow-md transition hover:bg-ivory cursor-pointer sm:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
