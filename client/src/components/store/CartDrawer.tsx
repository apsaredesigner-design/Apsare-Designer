"use client";

import React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/pricing";
import { luxuryEase } from "@/lib/motion";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";

export function CartDrawer() {
  const {
    cart,
    itemCount,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeItem,
    isLoading,
  } = useCart();

  const items = cart?.items ?? [];
  const summary = cart?.summary;
  const isInitialLoad = isLoading && !cart;

  return (
    <Drawer
      isOpen={isCartDrawerOpen}
      onClose={closeCartDrawer}
      title="Your Shopping Bag"
      subtitle={itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""}` : undefined}
      width="md"
    >
      {isInitialLoad ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-4 py-4">
              <Skeleton className="h-24 w-18 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-3 w-2/3" />
                <Skeleton variant="text" className="h-3 w-1/3" />
                <Skeleton variant="text" className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 && itemCount > 0 ? (
        // Guest with items saved locally: the server-side `cart` this component reads from is
        // only ever populated for logged-in users, so a guest's real (non-zero) bag would
        // otherwise render as this same "empty" state below.
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Sign in to view your bag"
          description="Your items are saved on this device. Sign in to view them and check out."
          actionLabel="Sign In"
          actionHref="/login?redirect=/cart"
          onAction={closeCartDrawer}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Your bag is empty"
          description="Explore our handpicked curation of festive silks, sarees, and modern ethnic silhouettes."
          actionLabel="Explore Collections"
          actionHref="/shop"
          onAction={closeCartDrawer}
        />
      ) : (
        <div className="flex h-full flex-col justify-between">
          {/* Free shipping bar */}
          {summary && summary.freeShippingRemaining > 0 ? (
            <div className="mb-4 rounded-md bg-sage-100 p-3 text-center text-xs text-ink/80 border border-sage-200">
              Add{" "}
              <span className="font-semibold text-ink">
                {formatPrice(summary.freeShippingRemaining)}
              </span>{" "}
              more to unlock <strong className="text-gold-600">FREE SHIPPING</strong>
            </div>
          ) : (
            <div className="mb-4 rounded-md bg-sage-400/20 p-2 text-center text-xs font-medium text-sage-700 border border-sage-400/40">
              ✨ You have unlocked Free Shipping!
            </div>
          )}

          {/* Cart items list */}
          <div className="flex-1 divide-y divide-sage-200 overflow-y-auto pr-1">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((item) => {
                const product = item.variant.product;
                const image = product.images?.[0];

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ ease: luxuryEase }}
                    className="flex gap-4 py-4"
                  >
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={closeCartDrawer}
                    className="relative h-24 w-18 shrink-0 overflow-hidden rounded bg-sage-100 border border-sage-200"
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
                        No image
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${product.slug}`}
                          onClick={closeCartDrawer}
                          className="font-medium text-xs text-ink hover:text-gold-600 line-clamp-1"
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          aria-label="Remove item"
                          className="text-ink/40 hover:text-sale transition p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="mt-0.5 text-[11px] text-ink/60">
                        Size: {item.variant.size} • Color: {item.variant.color}
                      </p>

                      {item.issue && (
                        <p className="mt-1 text-[11px] font-semibold text-sale">
                          {item.issue === "OUT_OF_STOCK"
                            ? "Out of stock"
                            : item.issue === "INSUFFICIENT_STOCK"
                            ? `Only ${item.variant.stock} left`
                            : "Unavailable"}
                        </p>
                      )}
                    </div>

                    {/* Price and Stepper */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-sage-300 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, Math.max(1, item.quantity - 1))
                          }
                          disabled={isLoading || item.quantity <= 1}
                          className="p-1 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">
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
                          className="p-1 text-ink/60 hover:text-ink disabled:opacity-30 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-ink">
                          {formatPrice(item.lineTotal)}
                        </span>
                        {item.lineMrp > item.lineTotal && (
                          <span className="ml-1.5 text-[11px] text-ink/40 line-through">
                            {formatPrice(item.lineMrp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>

          {/* Footer breakdown & checkout */}
          {summary && (
            <div className="border-t border-sage-200 pt-4 mt-2">
              <div className="space-y-1.5 text-xs text-ink/80">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(summary.subtotal)}</span>
                </div>
                {summary.couponDiscount > 0 && (
                  <div className="flex justify-between text-sage-600 font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(summary.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>
                    {summary.deliveryCharge === 0 ? (
                      <strong className="text-sage-600">FREE</strong>
                    ) : (
                      formatPrice(summary.deliveryCharge)
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-sage-200 pt-2 text-sm font-semibold text-ink">
                  <span>Total Amount</span>
                  <span>{formatPrice(summary.total)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/cart" onClick={closeCartDrawer} className="w-full">
                  <Button variant="outline" size="md" className="w-full">
                    View Bag
                  </Button>
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeCartDrawer}
                  className="w-full"
                >
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={cart?.hasUnavailableItems}
                  >
                    Checkout
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
