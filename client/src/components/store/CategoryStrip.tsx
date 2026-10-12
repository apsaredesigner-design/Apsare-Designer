"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FadeImage } from "@/components/store/FadeImage";
import { useScrollArrows } from "@/lib/useScrollArrows";

const CATEGORY_IMAGES = [
  "/images/categories/sarees.jpg",
  "/images/categories/blouses.jpg",
  "/images/categories/lehengas.jpg",
  "/images/categories/kurtas.jpg",
  "/images/categories/dupattas.jpg",
];

export interface CategoryStripProps {
  categories: { label: string; href: string }[];
}

export function CategoryStrip({ categories }: CategoryStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollBy } = useScrollArrows(scrollerRef);

  return (
    <div className="relative">
      {/* Horizontal scroll carousel instead of a wrapping grid: a fixed odd count would
          otherwise strand a lone card alone on the last row at some breakpoints. Arrow
          buttons (desktop only) make the scroll discoverable even when all cards happen to
          fit exactly, where drag/swipe is the only other way to tell. */}
      <div
        ref={scrollerRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:gap-6 sm:px-6"
      >
        {categories.map((cat, idx) => {
          const imgUrl = CATEGORY_IMAGES[idx] || CATEGORY_IMAGES[0]!;

          return (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative flex w-[42%] shrink-0 snap-start flex-col items-center text-center overflow-hidden rounded-lg bg-ivory shadow-xs hover:shadow-md transition-all duration-300 border border-sage-200 sm:w-[30%] md:w-[18%]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-sage-100">
                <FadeImage
                  src={imgUrl}
                  alt={cat.label}
                  loading="lazy"
                  className="object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute inset-x-0 bottom-3 text-center">
                  <span className="font-display text-lg font-medium tracking-wide text-white drop-shadow">
                    {cat.label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll to previous categories"
          className="absolute -left-1 top-[38%] hidden -translate-y-1/2 rounded-full border border-sage-200 bg-ivory/95 p-2.5 text-ink shadow-md transition hover:bg-ivory cursor-pointer sm:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll to more categories"
          className="absolute -right-1 top-[38%] hidden -translate-y-1/2 rounded-full border border-sage-200 bg-ivory/95 p-2.5 text-ink shadow-md transition hover:bg-ivory cursor-pointer sm:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
