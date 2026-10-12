"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FadeImage } from "./FadeImage";
import { HeroMarquee } from "./HeroMarquee";
import { luxuryEase } from "@/lib/motion";
import type { Banner } from "@/types";

export interface HeroBannerProps {
  banners: Banner[];
}

export function HeroBanner({ banners }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeBanners = banners.filter((b) => b.isActive);
  const total = activeBanners.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    const interval = setInterval(nextSlide, 6500);
    return () => clearInterval(interval);
  }, [total, nextSlide]);

  // Arrows are hidden below `sm` (see className below) since they'd otherwise sit on top of
  // the title/subtitle at narrow widths; swipe is the mobile equivalent.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || total <= 1) return;
    const delta = e.changedTouches[0]!.clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 40) prevSlide();
    else if (delta < -40) nextSlide();
  };

  if (total === 0) return null;

  const current = activeBanners[currentIndex];
  // Only the very first slide shown on initial paint is the LCP candidate; slides
  // reached later via the carousel controls should still load lazily.
  const isFirstPaint = currentIndex === 0;

  return (
    <section className="relative w-full overflow-hidden bg-sage-900 text-ivory">
      {/*
        Explicit per-breakpoint heights instead of aspect-ratio + min-height: the two fought
        each other (16:9 alone reaches 810px at a 1440px viewport, pushing the dots off-screen;
        min-height alone can overflow a short mobile-landscape viewport). max-h-[100svh] keeps
        it inside the visible area on mobile browsers with dynamic chrome.
      */}
      <div
        className="relative h-[480px] max-h-[100svh] w-full sm:h-[520px] md:h-[580px] lg:h-[640px] xl:h-[680px]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: luxuryEase }}
            className="absolute inset-0"
          >
            <FadeImage
              src={current.imageUrl}
              alt={current.title}
              loading={isFirstPaint ? "eager" : "lazy"}
              fetchPriority={isFirstPaint ? "high" : undefined}
              className="object-center"
            />
            {/* Cinematic luxury vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-black/20" />
          </motion.div>
        </AnimatePresence>

        {/* Banner content. Left/right padding at `sm`+ clears the arrow buttons' 44px touch
            target (left-4/right-4) with room to spare, so long subtitle lines never run
            under them. */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-center px-6 sm:px-16 md:px-20 lg:px-24">
          <div className="max-w-xl text-left">
            <motion.p
              key={`sub-${current.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xs uppercase tracking-[0.35em] text-gold-400 font-semibold"
            >
              Label Apsáre Exclusive
            </motion.p>

            <motion.h1
              key={`title-${current.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-3 font-display text-3xl font-semibold tracking-wide text-white sm:text-4xl md:text-5xl lg:text-6xl leading-[1.15]"
            >
              {current.title}
            </motion.h1>

            {current.subtitle && (
              <motion.p
                key={`desc-${current.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-4 text-sm sm:text-base text-ivory/85 leading-relaxed max-w-md"
              >
                {current.subtitle}
              </motion.p>
            )}

            {current.ctaHref && (
              <motion.div
                key={`cta-${current.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8"
              >
                <Link
                  href={current.ctaHref}
                  className="inline-flex items-center justify-center rounded-full bg-ivory px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-ink shadow-lg transition-all duration-300 hover:bg-gold-500 hover:text-ink hover:scale-105"
                >
                  {current.ctaLabel || "Discover Collection"}
                </Link>
              </motion.div>
            )}
          </div>
        </div>

        {/* Controls */}
        {total > 1 && (
          <>
            {/* Hidden below `sm`: at narrow widths the text column runs nearly full-width, so
                a vertically-centered arrow would sit on top of the title/subtitle. Swipe
                (onTouchStart/onTouchEnd above) covers mobile navigation instead. */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-ink/30 p-3 text-white/80 backdrop-blur-xs transition hover:bg-ink/60 hover:text-white cursor-pointer sm:flex sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-ink/30 p-3 text-white/80 backdrop-blur-xs transition hover:bg-ink/60 hover:text-white cursor-pointer sm:flex sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {activeBanners.map((b, index) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                    index === currentIndex
                      ? "w-8 bg-gold-400"
                      : "w-2 bg-white/40 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <HeroMarquee />
    </section>
  );
}
