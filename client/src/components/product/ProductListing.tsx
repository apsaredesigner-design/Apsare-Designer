"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SlidersHorizontal, X, SearchX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { ProductListResponse, ProductSort } from "@/types";

export interface ProductListingProps {
  initialData: ProductListResponse;
  title: string;
  subtitle?: string;
  categorySlug?: string;
  searchQuery?: string;
  forcedQueryParam?: Record<string, string>;
}

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "popularity", label: "Most Popular" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount", label: "Highest Discount" },
  { value: "rating", label: "Customer Rating" },
];

export function ProductListing({
  initialData,
  title,
  subtitle,
  categorySlug,
  searchQuery,
  forcedQueryParam = {},
}: ProductListingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { items, meta, facets } = initialData;

  // Read current filters from URL searchParams
  const currentSort = (searchParams.get("sort") as ProductSort) || "recommended";
  const selectedFabrics = searchParams.get("fabric")?.split(",").filter(Boolean) || [];
  const selectedOccasions = searchParams.get("occasion")?.split(",").filter(Boolean) || [];
  const selectedSizes = searchParams.get("size")?.split(",").filter(Boolean) || [];
  const selectedColors = searchParams.get("color")?.split(",").filter(Boolean) || [];
  const inStockOnly = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  // Helper to build URL with updated searchParams
  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Apply forced params if any
    Object.entries(forcedQueryParam).forEach(([k, v]) => {
      params.set(k, v);
    });

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    // Reset to page 1 if any filter other than page changes
    if (!updates.page) {
      params.delete("page");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (sort: ProductSort) => {
    updateQuery({ sort });
  };

  const toggleFilter = (
    key: "fabric" | "occasion" | "size" | "color",
    value: string,
    currentList: string[]
  ) => {
    let nextList: string[];
    if (currentList.includes(value)) {
      nextList = currentList.filter((item) => item !== value);
    } else {
      nextList = [...currentList, value];
    }
    updateQuery({ [key]: nextList.length > 0 ? nextList.join(",") : null });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    Object.entries(forcedQueryParam).forEach(([k, v]) => {
      params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeFilterCount =
    selectedFabrics.length +
    selectedOccasions.length +
    selectedSizes.length +
    selectedColors.length +
    (inStockOnly ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0);

  // Render Filter Sidebar / Drawer Content
  const renderFilters = () => (
    <div className="space-y-6 text-xs">
      {/* Clear all header */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between border-b border-sage-200 pb-3">
          <span className="font-semibold text-ink">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} applied
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-gold-600 hover:text-ink font-medium cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Categories facet if not in category page */}
      {!categorySlug && facets?.categories && facets.categories.length > 0 && (
        <div className="border-b border-sage-200 pb-4">
          <h4 className="mb-2 font-semibold uppercase tracking-wider text-ink/80">
            Categories
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {facets.categories.map((cat) => (
              <label
                key={cat.slug}
                className="flex items-center justify-between text-ink/80 hover:text-ink cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="categoryFacet"
                    checked={searchParams.get("category") === cat.slug}
                    onChange={() =>
                      updateQuery({
                        category:
                          searchParams.get("category") === cat.slug ? null : cat.slug,
                      })
                    }
                    className="accent-ink"
                  />
                  <span>{cat.name}</span>
                </span>
                <span className="text-[11px] text-ink/40">({cat.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Fabric Facet */}
      {facets?.fabrics && facets.fabrics.length > 0 && (
        <div className="border-b border-sage-200 pb-4">
          <h4 className="mb-2 font-semibold uppercase tracking-wider text-ink/80">
            Fabric
          </h4>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {facets.fabrics.map((f) => (
              <label
                key={f.value}
                className="flex items-center justify-between text-ink/80 hover:text-ink cursor-pointer select-none"
              >
                <Checkbox
                  checked={selectedFabrics.includes(f.value)}
                  onChange={() =>
                    toggleFilter("fabric", f.value, selectedFabrics)
                  }
                  label={f.value}
                />
                <span className="text-[11px] text-ink/40">({f.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Occasion Facet */}
      {facets?.occasions && facets.occasions.length > 0 && (
        <div className="border-b border-sage-200 pb-4">
          <h4 className="mb-2 font-semibold uppercase tracking-wider text-ink/80">
            Occasion
          </h4>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {facets.occasions.map((o) => (
              <label
                key={o.value}
                className="flex items-center justify-between text-ink/80 hover:text-ink cursor-pointer select-none"
              >
                <Checkbox
                  checked={selectedOccasions.includes(o.value)}
                  onChange={() =>
                    toggleFilter("occasion", o.value, selectedOccasions)
                  }
                  label={o.value}
                />
                <span className="text-[11px] text-ink/40">({o.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Size Facet */}
      {facets?.sizes && facets.sizes.length > 0 && (
        <div className="border-b border-sage-200 pb-4">
          <h4 className="mb-2 font-semibold uppercase tracking-wider text-ink/80">
            Size
          </h4>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const isSelected = selectedSizes.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleFilter("size", s.value, selectedSizes)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "border-ink bg-ink text-gold-300"
                      : "border-sage-300 bg-white text-ink hover:border-gold-500"
                  }`}
                >
                  {s.value} ({s.count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Facet */}
      {facets?.colors && facets.colors.length > 0 && (
        <div className="border-b border-sage-200 pb-4">
          <h4 className="mb-2 font-semibold uppercase tracking-wider text-ink/80">
            Color
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {facets.colors.map((c) => {
              const isSelected = selectedColors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleFilter("color", c.value, selectedColors)}
                  className={`flex items-center gap-2 rounded-md border p-1.5 text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? "border-ink bg-sage-100 font-semibold"
                      : "border-sage-200 bg-white hover:border-gold-400"
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: c.hex || "#9DAB78" }}
                  />
                  <span className="truncate">{c.value}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="border-b border-sage-200 pb-4">
        <Checkbox
          checked={inStockOnly}
          onChange={(e) =>
            updateQuery({ inStock: e.target.checked ? "true" : null })
          }
          label="In Stock Only"
          description="Exclude sold-out pieces"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header bar with breadcrumb/title & sort */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-sage-200 pb-6">
        <div>
          {subtitle && (
            <p className="text-[11px] uppercase tracking-[0.25em] text-gold-600 font-semibold">
              {subtitle}
            </p>
          )}
          <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-xs text-ink/60">
            Showing {items.length} of {meta.total} {meta.total === 1 ? "design" : "designs"}
          </p>
        </div>

        {/* Action Controls: Mobile Filter Button + Desktop Sort */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 rounded-full border border-sage-300 bg-white px-4 py-2 text-xs uppercase tracking-wider font-medium text-ink lg:hidden hover:border-gold-500 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="w-48">
            <Select
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value as ProductSort)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink/50 uppercase tracking-wider">
            Active:
          </span>
          <AnimatePresence>
            {selectedFabrics.map((f) => (
              <motion.span
                key={f}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs text-ink border border-sage-200"
              >
                <span>Fabric: {f}</span>
                <button
                  type="button"
                  onClick={() => toggleFilter("fabric", f, selectedFabrics)}
                  className="hover:text-sale cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
            {selectedOccasions.map((o) => (
              <motion.span
                key={o}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs text-ink border border-sage-200"
              >
                <span>Occasion: {o}</span>
                <button
                  type="button"
                  onClick={() => toggleFilter("occasion", o, selectedOccasions)}
                  className="hover:text-sale cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
            {selectedSizes.map((s) => (
              <motion.span
                key={s}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs text-ink border border-sage-200"
              >
                <span>Size: {s}</span>
                <button
                  type="button"
                  onClick={() => toggleFilter("size", s, selectedSizes)}
                  className="hover:text-sale cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
            {selectedColors.map((c) => (
              <motion.span
                key={c}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs text-ink border border-sage-200"
              >
                <span>Color: {c}</span>
                <button
                  type="button"
                  onClick={() => toggleFilter("color", c, selectedColors)}
                  className="hover:text-sale cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
            {inStockOnly && (
              <motion.span
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs text-ink border border-sage-200"
              >
                <span>In Stock Only</span>
                <button
                  type="button"
                  onClick={() => updateQuery({ inStock: null })}
                  className="hover:text-sale cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-sale underline ml-2 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main layout: Sidebar (desktop) + Grid */}
      <div className="mt-8 flex gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block border-r border-sage-200/80 pr-6">
          <div className="sticky top-28">
            <h3 className="font-display text-lg font-semibold tracking-wider text-ink mb-4">
              Refine By
            </h3>
            {renderFilters()}
          </div>
        </aside>

        {/* Mobile Filter Drawer */}
        <Drawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filter Collections"
          position="right"
          width="sm"
        >
          <div className="py-2">{renderFilters()}</div>
          <div className="sticky bottom-0 bg-ivory pt-4 border-t border-sage-200">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setIsFilterOpen(false)}
            >
              View {meta.total} Designs
            </Button>
          </div>
        </Drawer>

        {/* Product Grid Area */}
        <main className="flex-1">
          {items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-8 w-8" />}
              title="No designs match your selection"
              description="Try relaxing your filters, searching for a different weave or exploring our latest festive arrivals."
              actionLabel="Reset All Filters"
              onAction={clearAllFilters}
            />
          ) : (
            <>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                key={`${pathname}?${searchParams.toString()}`}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-3 gap-y-8 sm:gap-6"
              >
                {items.map((product) => (
                  <motion.div key={product.id} variants={staggerItem}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              <div className="mt-12">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={(page) => updateQuery({ page: String(page) })}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
