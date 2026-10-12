"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PriceTag } from "@/components/product/PriceTag";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import type { Product, Paginated, WishlistProduct } from "@/types";

const WISHLIST_PAGE_LIMIT = 20;

export default function WishlistPage() {
  const { user } = useAuth();
  const { toggleWishlist, moveToCart } = useWishlist();
  const toast = useToast();

  // The wishlist page paginates its own listing (the shared WishlistContext keeps a
  // separate, uncapped-page fetch just for the sitewide "is this in my wishlist" ids/badges).
  const [page, setPage] = useState(1);
  const [wishlistData, setWishlistData] = useState<Paginated<WishlistProduct> | null>(null);
  const [isListLoading, setIsListLoading] = useState(!!user);

  const loadPage = useCallback(
    async (targetPage: number) => {
      setIsListLoading(true);
      try {
        const res = await api<Paginated<WishlistProduct>>(
          `/wishlist?page=${targetPage}&limit=${WISHLIST_PAGE_LIMIT}`
        );
        setWishlistData(res);
      } catch {
        toast.error("Failed to load your wishlist");
      } finally {
        setIsListLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<Paginated<WishlistProduct>>(`/wishlist?page=${page}&limit=${WISHLIST_PAGE_LIMIT}`)
      .then((res) => {
        if (active) setWishlistData(res);
      })
      .catch(() => {
        if (active) toast.error("Failed to load your wishlist");
      })
      .finally(() => {
        if (active) setIsListLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, page, toast]);

  const items = wishlistData?.items ?? [];
  const total = wishlistData?.meta.total ?? 0;

  const handleRemove = async (productId: number) => {
    await toggleWishlist(productId);
    // If that was the last item on this page (and not page 1), step back a page.
    const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
    if (nextPage !== page) setPage(nextPage);
    else loadPage(page);
  };

  // Variant selector modal state when moving to cart
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const handleStartMoveToCart = async (productId: number, slug: string) => {
    try {
      // Fetch full product variants
      const fullProduct = await api<Product>(`/products/${slug}`);
      setSelectedProduct(fullProduct);
      const firstInStock = fullProduct.variants.find((v) => v.stock > 0);
      setSelectedVariantId(firstInStock?.id || fullProduct.variants[0]?.id || null);
      setIsVariantModalOpen(true);
    } catch {
      toast.error("Unable to load product options");
    }
  };

  const handleConfirmMoveToCart = async () => {
    if (!selectedProduct || !selectedVariantId) return;
    setIsMoving(true);
    try {
      const { notice } = await moveToCart(selectedProduct.id, selectedVariantId);
      if (notice) toast.info(notice);
      else toast.success(`Moved ${selectedProduct.name} to bag`);
      setIsVariantModalOpen(false);
      loadPage(page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to move item to bag";
      toast.error(message);
    } finally {
      setIsMoving(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<Heart className="h-10 w-10 text-gold-500" />}
          title="Save Your Desired Silhouettes"
          description="Sign in to curate your personal wishlist and receive notifications on festive arrivals and restocks."
          actionLabel="Sign In to View Wishlist"
          actionHref="/login?redirect=/wishlist"
        />
      </div>
    );
  }

  if (isListLoading && !wishlistData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="border-b border-sage-200 pb-4 mb-8 space-y-2">
          <Skeleton variant="text" className="h-3 w-28" />
          <Skeleton variant="text" className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 gap-y-8 sm:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="rounded-lg border border-sage-200 bg-white p-3">
              <Skeleton className="aspect-[3/4] w-full rounded" />
              <div className="mt-3 space-y-2">
                <Skeleton variant="text" className="h-3 w-1/2" />
                <Skeleton variant="text" className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<Heart className="h-10 w-10 text-sage-400" />}
          title="Your Wishlist is Empty"
          description="Explore our collections of handwoven sarees, silk lehengas and festive dupattas, and save your favorites."
          actionLabel="Explore Collections"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="border-b border-sage-200 pb-4 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold-600 font-semibold">
            Saved Wardrobe
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
            My Wishlist ({total})
          </h1>
        </div>
        <Link
          href="/shop"
          className="text-xs uppercase tracking-wider font-semibold text-gold-700 hover:text-ink"
        >
          Continue Shopping
        </Link>
      </div>

      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 gap-y-8 sm:gap-6 transition-opacity ${
          isListLoading ? "opacity-50" : "opacity-100"
        }`}
      >
        {items.map((product) => {
          const primaryImg = product.images?.[0];

          return (
            <div
              key={product.id}
              className="group relative flex flex-col rounded-lg border border-sage-200 bg-white p-3 shadow-xs hover:border-gold-400 transition"
            >
              {/* Product Image */}
              <Link
                href={`/product/${product.slug}`}
                className="relative aspect-[3/4] w-full overflow-hidden rounded bg-sage-100"
              >
                {primaryImg?.url ? (
                  <FadeImage
                    src={primaryImg.url}
                    alt={primaryImg.alt || product.name}
                    loading="lazy"
                    className="object-top transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink/40">
                    No image
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(product.id);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink/60 hover:text-sale shadow-xs cursor-pointer"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>

              {/* Info */}
              <div className="mt-3 flex flex-1 flex-col justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-ink/50">
                    {product.brand}
                  </span>
                  <Link
                    href={`/product/${product.slug}`}
                    className="mt-0.5 block font-display text-sm sm:text-base font-medium text-ink hover:text-gold-600 line-clamp-1"
                  >
                    {product.name}
                  </Link>

                  <div className="mt-1">
                    <PriceTag mrp={product.mrp} salePrice={product.salePrice} />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sage-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px]"
                    leftIcon={<ShoppingBag className="h-3.5 w-3.5" />}
                    onClick={() =>
                      handleStartMoveToCart(product.id, product.slug)
                    }
                  >
                    Move to Bag
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {wishlistData && wishlistData.meta.totalPages > 1 && (
        <Pagination
          currentPage={wishlistData.meta.page}
          totalPages={wishlistData.meta.totalPages}
          onPageChange={(p) => {
            setIsListLoading(true);
            setPage(p);
          }}
        />
      )}

      {/* Variant Selection Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
          title="Select Size & Color"
          description={`Choose your preferred variant for ${selectedProduct.name}`}
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="divide-y divide-sage-200 max-h-64 overflow-y-auto">
              {selectedProduct.variants.map((v) => {
                const isOutOfStock = v.stock === 0;
                const isSelected = selectedVariantId === v.id;

                return (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between p-3 cursor-pointer rounded-md transition ${
                      isSelected
                        ? "bg-sage-100 font-semibold"
                        : isOutOfStock
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-sage-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="variantChoice"
                        disabled={isOutOfStock}
                        checked={isSelected}
                        onChange={() => setSelectedVariantId(v.id)}
                        className="accent-ink"
                      />
                      <span>
                        Size: <strong>{v.size}</strong> • Color:{" "}
                        <strong>{v.color}</strong>
                      </span>
                    </div>

                    <span className="text-[11px]">
                      {isOutOfStock ? (
                        <span className="text-sale font-medium">Out of Stock</span>
                      ) : (
                        <span className="text-sage-700">In Stock ({v.stock})</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sage-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVariantModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!selectedVariantId}
                isLoading={isMoving}
                onClick={handleConfirmMoveToCart}
              >
                Add to Bag
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
