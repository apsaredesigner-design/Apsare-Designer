import React from "react";
import Link from "next/link";
import { HeroBanner } from "@/components/store/HeroBanner";
import { ProductRail } from "@/components/store/ProductRail";
import { CategoryStrip } from "@/components/store/CategoryStrip";
import { FadeImage } from "@/components/store/FadeImage";
import { getHome } from "@/server/queries";
import { NAV_CATEGORIES } from "@/lib/constants";
import type { HomeResponse } from "@/types";

export const dynamic = "force-dynamic";

async function getHomeData(): Promise<HomeResponse | null> {
  try {
    return await getHome();
  } catch (err) {
    console.error("Failed to load home products:", err);
    return null;
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  const banners = data?.banners ?? [];
  const newArrivals = data?.newArrivals ?? [];
  const trending = data?.trending ?? [];
  const bestSellers = data?.bestSellers ?? [];
  const deals = data?.deals ?? [];
  const topRated = data?.topRated ?? [];
  const underPrice = data?.underPrice ?? [];
  const underPriceLimit = data?.underPriceLimit ?? 1999;

  return (
    <div className="flex flex-col">
      {/* 1. Hero Banner Carousel */}
      <HeroBanner banners={banners} />

      {/* 2. Curated Categories Strip */}
      <section className="border-b border-sage-200/80 bg-sage-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold-600 font-semibold">
              Curated Wardrobe
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-wide text-ink sm:text-3xl">
              Shop by Category
            </h2>
          </div>

          <CategoryStrip categories={NAV_CATEGORIES} />
        </div>
      </section>

      {/* 3. The 6 Product Rails (hides empty ones automatically) */}

      {/* Rail 1: New Arrivals (first visible rail — leading cards render eagerly) */}
      <ProductRail
        title="New Arrivals"
        subtitle="Fresh off the Looms"
        products={newArrivals}
        viewAllHref="/new-arrivals"
        priorityCount={4}
      />

      {/* Rail 2: Trending Now */}
      <ProductRail
        title="Trending Now"
        subtitle="Most Coveted Silhouettes"
        products={trending}
        viewAllHref="/shop?sort=popularity"
        className="bg-sage-50/50"
      />

      {/* Rail 3: Best Sellers */}
      <ProductRail
        title="Best sellers"
        subtitle="Most ordered right now"
        products={bestSellers}
        viewAllHref="/shop?sort=popularity"
      />

      {/* Brand Editorial Feature Banner */}
      <section className="bg-sage-400 my-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 py-14 md:flex-row md:py-20">
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-5xl leading-tight">
              Silk, cotton, georgette
              <br />
              and Banarasi sarees.
            </h2>
            <p className="mt-4 max-w-lg text-sm sm:text-base text-ink/85 leading-relaxed">
              Festive drapes for weddings and pujas, lighter weaves for every
              day, and blouses, lehengas and dupattas to wear with them.
            </p>
            <div className="mt-8">
              <Link
                href="/category/sarees"
                className="inline-flex rounded-full bg-ink px-8 py-3.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-sage-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Shop sarees
              </Link>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl shadow-xl">
            <FadeImage src="/images/banners/banner-festive.jpg" alt="Festive saree" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Rail 4: Deals of the Day */}
      <ProductRail
        title="Festive Deals"
        subtitle="Limited Period Curations"
        products={deals}
        viewAllHref="/offers"
      />

      {/* Rail 5: Top Rated */}
      <ProductRail
        title="Top Rated by Connoisseurs"
        subtitle="Celebrated for Quality & Handfeel"
        products={topRated}
        viewAllHref="/shop?sort=rating"
        className="bg-sage-50/50"
      />

      {/* Rail 6: Under Price Limit */}
      <ProductRail
        title={`Under ₹${underPriceLimit.toLocaleString("en-IN")}`}
        subtitle="The Everyday Luxury Edit"
        products={underPrice}
        viewAllHref={`/shop?maxPrice=${underPriceLimit}`}
      />
    </div>
  );
}
