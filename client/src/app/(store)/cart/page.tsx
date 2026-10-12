"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/pricing";
import {
  ShoppingBag,
  Trash2,
  Heart,
  Plus,
  Minus,
  Tag,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import type { AvailableCouponsResponse, AvailableCoupon } from "@/types";

// Available coupons rarely change and the endpoint is user-specific (so it can't be a
// public/CDN cache) — a short in-memory TTL avoids refetching identical data every time this
// page remounts within the same visit (e.g. cart -> shop -> cart). Keyed by `scope` (the
// viewer's user id, or "guest") so a login/logout within the TTL window can't leak one
// account's personalized coupons to the next viewer in the same tab.
const AVAILABLE_COUPONS_TTL_MS = 30_000;
let availableCouponsCache: { scope: string; items: AvailableCoupon[]; fetchedAt: number } | null = null;

async function getAvailableCoupons(scope: string): Promise<AvailableCoupon[]> {
  if (
    availableCouponsCache &&
    availableCouponsCache.scope === scope &&
    Date.now() - availableCouponsCache.fetchedAt < AVAILABLE_COUPONS_TTL_MS
  ) {
    return availableCouponsCache.items;
  }
  const res = await api<AvailableCouponsResponse>("/coupons/available");
  availableCouponsCache = { scope, items: res.items, fetchedAt: Date.now() };
  return res.items;
}

export default function CartPage() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    cart,
    itemCount,
    updateQuantity,
    removeItem,
    moveToWishlist,
    applyCoupon,
    removeCoupon,
    isLoading,
  } = useCart();
  const isInitialLoad = isLoading && !cart;

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);

  useEffect(() => {
    getAvailableCoupons(user ? String(user.id) : "guest")
      .then(setAvailableCoupons)
      .catch(() => {});
  }, [user]);

  const items = cart?.items ?? [];
  const summary = cart?.summary;

  const handleApplyCoupon = async (e?: React.FormEvent, codeToApply?: string) => {
    if (e) e.preventDefault();
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) return;

    setIsApplyingCoupon(true);
    try {
      await applyCoupon(code);
      setCouponCodeInput("");
      toast.success(`Coupon ${code} applied!`);
    } catch {
      toast.error("Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
      toast.info("Coupon removed");
    } catch {
      toast.error("Failed to remove coupon");
    }
  };

  if (isInitialLoad) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="border-b border-sage-200 pb-4 mb-8 space-y-2">
          <Skeleton variant="text" className="h-3 w-32" />
          <Skeleton variant="text" className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-5 rounded-xl border border-sage-200 bg-white p-5">
                <Skeleton className="aspect-[3/4] w-24 sm:w-28 shrink-0 rounded-md" />
                <div className="flex-1 space-y-3">
                  <Skeleton variant="text" className="h-3 w-1/4" />
                  <Skeleton variant="text" className="h-4 w-2/3" />
                  <Skeleton variant="text" className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && itemCount > 0) {
    // Guest with items saved locally: `cart` (and therefore `items`) is only ever populated
    // for logged-in users, so a guest's real (non-zero) bag would otherwise render as the
    // genuinely-empty state below.
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10 text-sage-500" />}
          title="Sign in to view your bag"
          description="Your items are saved on this device. Sign in to view them and check out."
          actionLabel="Sign In"
          actionHref="/login?redirect=/cart"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10 text-sage-500" />}
          title="Your Shopping Bag is Empty"
          description="Looks like you haven't added any handcrafted sarees or festive silhouettes to your bag yet."
          actionLabel="Explore Latest Collections"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Title */}
      <div className="border-b border-sage-200 pb-4 mb-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-600 font-semibold">
          Review & Checkout
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
          Shopping Bag ({itemCount})
        </h1>
      </div>

      {/* Free shipping alert */}
      {summary && (
        <div className="mb-8 rounded-lg border border-sage-300 bg-sage-50 p-4 text-xs text-ink/80 flex items-center justify-between">
          {summary.freeShippingRemaining > 0 ? (
            <p>
              Add items worth{" "}
              <strong className="text-ink">
                {formatPrice(summary.freeShippingRemaining)}
              </strong>{" "}
              more to enjoy <strong className="text-gold-600">FREE SHIPPING</strong>!
            </p>
          ) : (
            <p className="font-medium text-sage-700">
              ✨ Congratulations! Your order qualifies for Free Standard Shipping.
            </p>
          )}
          <Link
            href="/shop"
            className="text-xs uppercase tracking-wider font-semibold text-gold-700 hover:text-ink hidden sm:block"
          >
            Add More
          </Link>
        </div>
      )}

      {/* 2-column layout: Cart items left, Summary right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const product = item.variant.product;
            const image = product.images?.[0];

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-5 rounded-xl border border-sage-200 bg-white p-5 shadow-xs"
              >
                {/* Image */}
                <Link
                  href={`/product/${product.slug}`}
                  className="relative aspect-[3/4] w-24 sm:w-28 shrink-0 overflow-hidden rounded-md bg-sage-100 border border-sage-200"
                >
                  {image?.url ? (
                    <FadeImage
                      src={image.url}
                      alt={image.alt || product.name}
                      loading="lazy"
                      className="object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-ink/40">
                      No photo
                    </div>
                  )}
                </Link>

                {/* Info & controls */}
                <div className="flex flex-1 flex-col justify-between text-xs">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-ink/50 font-medium">
                          {product.brand}
                        </span>
                        <Link
                          href={`/product/${product.slug}`}
                          className="mt-0.5 block font-display text-base sm:text-lg font-medium text-ink hover:text-gold-600"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-ink/60">
                          Size: <strong>{item.variant.size}</strong> • Color:{" "}
                          <strong>{item.variant.color}</strong>
                        </p>
                      </div>

                      {/* Line pricing */}
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-semibold text-ink">
                          {formatPrice(item.lineTotal)}
                        </span>
                        {item.lineMrp > item.lineTotal && (
                          <div className="text-[11px] text-ink/40 line-through">
                            {formatPrice(item.lineMrp)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stock alert */}
                    {item.issue && (
                      <p className="mt-2 text-xs font-semibold text-sale">
                        {item.issue === "OUT_OF_STOCK"
                          ? "This item is now out of stock."
                          : item.issue === "INSUFFICIENT_STOCK"
                          ? `Only ${item.variant.stock} units remaining.`
                          : "Item is unavailable."}
                      </p>
                    )}
                  </div>

                  {/* Quantity Stepper & Action buttons */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-sage-200/80 pt-3">
                    <div className="flex items-center rounded-full border border-sage-300 bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, Math.max(1, item.quantity - 1))
                        }
                        disabled={isLoading || item.quantity <= 1}
                        className="px-2.5 py-1 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            Math.min(item.maxQuantity, item.quantity + 1)
                          )
                        }
                        disabled={isLoading || item.quantity >= item.maxQuantity}
                        className="px-2.5 py-1 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => moveToWishlist(item.id)}
                        className="flex items-center gap-1.5 text-ink/70 hover:text-gold-600 transition cursor-pointer"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        <span>Move to Wishlist</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-1.5 text-ink/50 hover:text-sale transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Coupon, Pricing Breakdown & Checkout CTA */}
        <div className="lg:col-span-4 space-y-6">
          {/* Coupon Box */}
          <div className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs text-xs">
            <h3 className="font-semibold uppercase tracking-wider text-ink mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-gold-600" />
              <span>Coupons & Offers</span>
            </h3>

            {cart?.coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-sage-50 border border-sage-300 p-3">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sage-700">
                    <Check className="h-3.5 w-3.5" />
                    <span>{cart.coupon.code}</span>
                  </div>
                  <p className="text-[11px] text-ink/65 mt-0.5">
                    {cart.coupon.description || "Coupon discount applied"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="rounded-full p-1 text-ink/40 hover:text-sale"
                  aria-label="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => handleApplyCoupon(e)} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-md border border-sage-300 px-3 py-2 text-xs uppercase text-ink outline-none focus:border-gold-500"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  isLoading={isApplyingCoupon}
                  className="shrink-0"
                >
                  Apply
                </Button>
              </form>
            )}

            {cart?.couponError && (
              <p className="mt-2 text-[11px] text-sale font-medium">
                {cart.couponError}
              </p>
            )}

            {/* Available coupons chips */}
            {availableCoupons.length > 0 && !cart?.coupon && (
              <div className="mt-4 border-t border-sage-200 pt-3">
                <p className="text-[11px] text-ink/50 mb-2">Available Coupons:</p>
                <div className="space-y-1.5">
                  {availableCoupons.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between rounded border border-dashed border-sage-300 p-2 text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-ink">{c.code}</span>
                        <p className="text-ink/60 text-[10px]">{c.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(undefined, c.code)}
                        className="text-gold-600 font-semibold hover:text-ink cursor-pointer uppercase text-[10px]"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          {summary && (
            <div className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs text-xs space-y-3">
              <h3 className="font-semibold uppercase tracking-wider text-ink mb-4">
                Price Details
              </h3>

              <div className="flex justify-between text-ink/75">
                <span>Total MRP ({itemCount} items)</span>
                <span>{formatPrice(summary.totalMrp)}</span>
              </div>

              {summary.discountOnMrp > 0 && (
                <div className="flex justify-between text-sage-600 font-medium">
                  <span>Bag Discount</span>
                  <span>-{formatPrice(summary.discountOnMrp)}</span>
                </div>
              )}

              {summary.couponDiscount > 0 && (
                <div className="flex justify-between text-sage-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(summary.couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-ink/75">
                <span>Shipping Fee</span>
                <span>
                  {summary.deliveryCharge === 0 ? (
                    <strong className="text-sage-600">FREE</strong>
                  ) : (
                    formatPrice(summary.deliveryCharge)
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-sage-200 pt-3 text-sm font-semibold text-ink">
                <span>Total Payable</span>
                <span>{formatPrice(summary.total)}</span>
              </div>

              <div className="pt-3">
                <Link href="/checkout" className="block w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={cart?.hasUnavailableItems}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Proceed to Checkout
                  </Button>
                </Link>
                {cart?.hasUnavailableItems && (
                  <p className="mt-2 text-center text-[11px] text-sale">
                    Please remove unavailable items to continue to checkout.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
