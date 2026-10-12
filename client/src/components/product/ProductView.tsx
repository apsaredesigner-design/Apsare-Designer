"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShoppingBag,
  Zap,
  Truck,
  Star,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/pricing";
import { AnimatePresence, motion } from "motion/react";
import { luxuryEase } from "@/lib/motion";
import type {
  Product,
  ProductVariant,
  PincodeCheck,
  Review,
  Paginated,
} from "@/types";

export interface ProductViewProps {
  product: Product;
  reviews: Paginated<Review>;
}

export function ProductView({ product, reviews: initialReviews }: ProductViewProps) {
  const router = useRouter();
  const { addToCart, isLoading: isCartLoading } = useCart();
  const { inWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const toast = useToast();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState(
    product.variants[0]?.size || ""
  );
  const [selectedColor, setSelectedColor] = useState(
    product.variants[0]?.color || ""
  );
  const [quantity, setQuantity] = useState(1);

  // Pincode state
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeResult, setPincodeResult] = useState<PincodeCheck | null>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewList, setReviewList] = useState(initialReviews.items);
  const [reviewsMeta, setReviewsMeta] = useState(initialReviews.meta);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  const loadReviewsPage = async (page: number) => {
    setIsReviewsLoading(true);
    try {
      const res = await api<Paginated<Review>>(
        `/products/${product.slug}/reviews?page=${page}&limit=${reviewsMeta.limit}`
      );
      setReviewList(res.items);
      setReviewsMeta(res.meta);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const images = product.images.length > 0 ? product.images : [{ id: 0, url: "/placeholder.jpg", alt: product.name, sortOrder: 0 }];
  const activeImage = images[activeImageIdx] || images[0];

  // Match selected variant
  const currentVariant: ProductVariant | undefined = product.variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  ) || product.variants[0];

  const inStock = (currentVariant?.stock ?? 0) > 0;
  const maxAvailable = Math.min(10, currentVariant?.stock ?? 0);

  const handlePincodeCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincodeInput.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      toast.error("Please enter a valid 6-digit Indian PIN code");
      return;
    }
    setIsCheckingPincode(true);
    try {
      const res = await api<PincodeCheck>(`/payments/pincode/${cleanPin}`);
      setPincodeResult(res);
    } catch {
      toast.error("Unable to check pincode serviceability");
    } finally {
      setIsCheckingPincode(false);
    }
  };

  const handleAddToCart = async (openDrawer = true) => {
    if (!currentVariant) return;
    if (!inStock) {
      toast.error("This variant is currently out of stock");
      return;
    }
    try {
      const { notice } = await addToCart(currentVariant.id, quantity, openDrawer);
      if (notice) {
        toast.info(notice);
      } else {
        toast.success(`Added ${product.name} to bag`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add to bag";
      toast.error(message);
    }
  };

  const handleBuyNow = async () => {
    if (!currentVariant || !inStock) return;
    await handleAddToCart(false);
    router.push("/checkout");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to submit a review");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const created = await api<Review>(`/products/${product.slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      toast.success("Thank you for reviewing this creation!");
      setReviewList((prev) => [created, ...prev]);
      setReviewsMeta((prev) => ({ ...prev, total: prev.total + 1 }));
      setIsReviewModalOpen(false);
      setReviewComment("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Only verified buyers who have received this product can review it.");
      } else if (err instanceof ApiError && err.status === 409) {
        toast.error("You have already reviewed this product.");
      } else {
        const message = err instanceof Error ? err.message : "Failed to submit review";
        toast.error(message);
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const isFavorited = inWishlist(product.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-8 sm:px-6">
      {/* Breadcrumb bar */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs text-ink/60"
      >
        <Link href="/" className="hover:text-gold-600 transition">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-ink/30" />
        <Link href="/shop" className="hover:text-gold-600 transition">
          Shop
        </Link>
        {product.breadcrumb.map((crumb) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="h-3 w-3 text-ink/30" />
            <Link
              href={`/category/${crumb.slug}`}
              className="hover:text-gold-600 transition"
            >
              {crumb.name}
            </Link>
          </React.Fragment>
        ))}
        <ChevronRight className="h-3 w-3 text-ink/30" />
        <span className="font-semibold text-ink truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      {/* Main 2-column layout: Gallery left, Info right */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left: Gallery (5 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col-reverse md:flex-row gap-4">
          {/* Thumbnails rail */}
          {images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[560px] pb-2 md:pb-0 shrink-0">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative h-20 w-16 overflow-hidden rounded-md border-2 transition cursor-pointer shrink-0 ${
                    idx === activeImageIdx
                      ? "border-gold-500 shadow-sm"
                      : "border-sage-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <FadeImage
                    src={img.url}
                    alt={img.alt || `${product.name} view ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="object-top"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Hero Image */}
          <div className="relative aspect-[3/4] w-full flex-1 overflow-hidden rounded-lg bg-sage-100 border border-sage-200/80">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage.id || activeImageIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: luxuryEase }}
                className="absolute inset-0"
              >
                <FadeImage
                  src={activeImage.url}
                  alt={activeImage.alt || product.name}
                  loading="eager"
                  className="object-top transition-transform duration-700 hover:scale-105"
                />
              </motion.div>
            </AnimatePresence>

            {/* Badges on image */}
            <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10 pointer-events-none">
              {product.isDealOfDay && (
                <Badge variant="sale" size="md">
                  Deal of the Day
                </Badge>
              )}
              {product.isBestSeller && (
                <Badge variant="gold" size="md">
                  Best seller
                </Badge>
              )}
              {product.isNewArrival && (
                <Badge variant="sage" size="md">
                  New Arrival
                </Badge>
              )}
            </div>

            {/* Wishlist float button */}
            <motion.button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              whileTap={{ scale: 0.85 }}
              animate={isFavorited ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              aria-label="Wishlist"
              className={`absolute right-3 top-3 z-10 rounded-full p-2.5 backdrop-blur-md transition shadow-md cursor-pointer ${
                isFavorited
                  ? "bg-white text-sale"
                  : "bg-white/80 text-ink/70 hover:bg-white hover:text-sale"
              }`}
            >
              <Heart
                className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`}
              />
            </motion.button>
          </div>
        </div>

        {/* Right: Product Details & Buying Actions (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col justify-start">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-600 font-semibold">
            {product.category.name} • {product.brand}
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
            {product.name}
          </h1>

          <p className="mt-1 text-xs text-ink/50 font-mono">
            Code: {product.code}
          </p>

          {/* Rating overview */}
          {product.ratingCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="flex items-center text-gold-500">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < Math.round(product.ratingAvg)
                        ? "fill-current"
                        : "text-sage-300"
                    }`}
                  />
                ))}
              </div>
              <span className="font-semibold text-ink">{product.ratingAvg}</span>
              <span className="text-ink/50">
                ({product.ratingCount} {product.ratingCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          )}

          {/* Price Block */}
          <div className="mt-5 border-y border-sage-200 py-4">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-semibold text-ink">
                {formatPrice(product.salePrice)}
              </span>
              {product.mrp > product.salePrice && (
                <>
                  <span className="text-base text-ink/40 line-through">
                    {formatPrice(product.mrp)}
                  </span>
                  <Badge variant="sale" size="md">
                    {product.discountPercent}% OFF
                  </Badge>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink/60">
              Inclusive of all taxes. Free shipping across India on orders above ₹1,999.
            </p>
          </div>

          {/* Variants: Colors */}
          {product.colors.length > 0 && (
            <div className="mt-6">
              <label className="block text-xs uppercase tracking-wider text-ink/80 font-medium mb-2">
                Color: <span className="text-ink font-semibold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((c) => {
                  const isSelected = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition cursor-pointer ${
                        isSelected
                          ? "border-ink bg-ink text-gold-300 font-medium shadow-sm"
                          : "border-sage-300 bg-white text-ink hover:border-gold-500"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: c.hex || "#9DAB78" }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variants: Sizes */}
          {product.sizes.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-ink/80 font-medium">
                  Size: <span className="text-ink font-semibold">{selectedSize}</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((s) => {
                  const isSelected = selectedSize === s;
                  const variantForSize = product.variants.find(
                    (v) => v.size === s && v.color === selectedColor
                  );
                  const isVariantOutOfStock =
                    variantForSize && variantForSize.stock === 0;

                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isVariantOutOfStock}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-12 rounded-md border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        isSelected
                          ? "border-ink bg-ink text-gold-300 shadow-sm"
                          : isVariantOutOfStock
                          ? "border-sage-200 bg-sage-50 text-ink/30 cursor-not-allowed line-through"
                          : "border-sage-300 bg-white text-ink hover:border-gold-500"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Status indicator */}
          <div className="mt-4">
            {!inStock ? (
              <p className="text-xs font-semibold text-sale flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                <span>Out of Stock in this variant</span>
              </p>
            ) : currentVariant && currentVariant.stock <= 3 ? (
              <p className="text-xs font-semibold text-gold-600 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gold-500 animate-ping" />
                <span>Hurry, only {currentVariant.stock} left in stock!</span>
              </p>
            ) : (
              <p className="text-xs font-medium text-sage-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>In Stock, ready to dispatch</span>
              </p>
            )}
          </div>

          {/* Quantity and Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            {inStock && (
              <div className="flex h-12 items-center rounded-full border border-sage-300 bg-white px-3 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-2 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer font-bold text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                  disabled={quantity >= maxAvailable}
                  className="px-2 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer font-bold text-sm"
                >
                  +
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="lg"
              disabled={!inStock}
              isLoading={isCartLoading}
              onClick={() => handleAddToCart(true)}
              leftIcon={<ShoppingBag className="h-4 w-4" />}
              className="w-full sm:flex-1 h-12"
            >
              Add to Bag
            </Button>

            <Button
              variant="primary"
              size="lg"
              disabled={!inStock}
              onClick={handleBuyNow}
              leftIcon={<Zap className="h-4 w-4 text-gold-400" />}
              className="w-full sm:flex-1 h-12"
            >
              Buy Now
            </Button>
          </div>

          {/* Pincode & Delivery Checker */}
          <div className="mt-8 rounded-lg border border-sage-200 bg-sage-50/60 p-4">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-ink flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-gold-600" />
              <span>Delivery & Pincode Check</span>
            </h4>
            <form onSubmit={handlePincodeCheck} className="mt-2.5 flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value)}
                placeholder="Enter 6-digit PIN code"
                className="w-full rounded-md border border-sage-300 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-gold-500"
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                isLoading={isCheckingPincode}
                className="shrink-0"
              >
                Check
              </Button>
            </form>

            {pincodeResult && (
              <div className="mt-3 text-xs">
                {pincodeResult.serviceable ? (
                  <div className="space-y-1 text-sage-700">
                    <p className="flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                      <span>
                        Delivery by{" "}
                        <strong>{pincodeResult.estimatedDelivery}</strong> (
                        {pincodeResult.deliveryDays} business days)
                      </span>
                    </p>
                    <p className="text-[11px] text-ink/70">
                      {pincodeResult.codAvailable
                        ? "✓ Cash on Delivery is available for this location"
                        : "✕ COD not available; prepaid orders only"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sale font-medium flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Currently unserviceable for PIN {pincodeResult.pincode}</span>
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Tabs & Product Specifications */}
      <div className="mt-16 border-t border-sage-200 pt-10">
        <h3 className="font-display text-2xl font-semibold text-ink mb-6">
          Craft & Fabric Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-ink/80 leading-relaxed">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold uppercase tracking-wider text-ink mb-1">
                Description
              </h4>
              <p className="whitespace-pre-line text-ink/75">{product.description}</p>
            </div>

            {product.careInstructions && (
              <div>
                <h4 className="font-semibold uppercase tracking-wider text-ink mb-1">
                  Wash & Care Instructions
                </h4>
                <p className="text-ink/75">{product.careInstructions}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-sage-200 bg-sage-50/50 p-5">
            <h4 className="font-semibold uppercase tracking-wider text-ink mb-3">
              Specifications
            </h4>
            <dl className="divide-y divide-sage-200/80">
              {product.fabric && (
                <div className="flex justify-between py-2">
                  <dt className="text-ink/50">Fabric</dt>
                  <dd className="font-medium text-ink">{product.fabric}</dd>
                </div>
              )}
              {product.occasion && (
                <div className="flex justify-between py-2">
                  <dt className="text-ink/50">Occasion</dt>
                  <dd className="font-medium text-ink">{product.occasion}</dd>
                </div>
              )}
              {product.pattern && (
                <div className="flex justify-between py-2">
                  <dt className="text-ink/50">Pattern / Weave</dt>
                  <dd className="font-medium text-ink">{product.pattern}</dd>
                </div>
              )}
              {product.specs &&
                Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-2">
                    <dt className="text-ink/50 capitalize">{key}</dt>
                    <dd className="font-medium text-ink">{val}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="mt-16 border-t border-sage-200 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Customer Reviews
            </h3>
            <p className="text-xs text-ink/60 mt-1">
              Real reflections from our patrons
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!user) {
                toast.info("Please sign in to share your review.");
                router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                return;
              }
              setIsReviewModalOpen(true);
            }}
          >
            Write a Review
          </Button>
        </div>

        {isReviewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-lg border border-sage-200 bg-white p-4 space-y-2">
                <Skeleton variant="text" className="h-3 w-1/3" />
                <Skeleton variant="text" className="h-3 w-full" />
                <Skeleton variant="text" className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : reviewList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-sage-300 p-8 text-center text-xs text-ink/60">
            No reviews yet for this creation. Be the first verified patron to review it!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewList.map((rev) => (
              <div
                key={rev.id}
                className="rounded-lg border border-sage-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-ink">
                    {rev.author}
                  </span>
                  <div className="flex text-gold-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < rev.rating ? "fill-current" : "text-sage-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="mt-2 text-xs text-ink/75 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-[10px] text-ink/40">
                  {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {reviewsMeta.totalPages > 1 && (
          <Pagination
            currentPage={reviewsMeta.page}
            totalPages={reviewsMeta.totalPages}
            onPageChange={loadReviewsPage}
          />
        )}
      </section>

      {/* Review Submission Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Review this Creation"
        description="Share your experience regarding drape, fabric handfeel, and finish."
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink/80 mb-2">
              Your Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 text-gold-500 hover:scale-110 transition cursor-pointer"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= reviewRating ? "fill-current" : "text-sage-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink/80 mb-1.5">
              Your Review (Optional)
            </label>
            <textarea
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="How did the saree feel? Was the zari weave as expected?"
              className="w-full rounded-md border border-sage-300 p-3 text-xs text-ink outline-none focus:border-gold-500"
            />
          </div>

          <p className="text-[11px] text-ink/50">
            Note: Reviews are permitted for verified purchases that have been delivered.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingReview}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>

      {/* Sticky Mobile Add to Bag Bar */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: luxuryEase }}
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-sage-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md sm:hidden"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-base font-semibold text-ink">
            {formatPrice(product.salePrice)}
          </span>
          <span className="text-[10px] text-ink/60 truncate">
            {selectedSize ? `Size: ${selectedSize}` : "In Stock"}
            {selectedColor ? ` • ${selectedColor}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleWishlist(product.id)}
            aria-label="Wishlist"
            className="h-10 w-10 p-0"
          >
            <Heart className={`h-4 w-4 ${isFavorited ? "fill-sale text-sale" : ""}`} />
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!inStock}
            isLoading={isCartLoading}
            onClick={() => handleAddToCart(true)}
            leftIcon={<ShoppingBag className="h-4 w-4" />}
            className="h-10 px-5"
          >
            {inStock ? "Add to Bag" : "Sold Out"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
