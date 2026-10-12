"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FadeImage } from "@/components/store/FadeImage";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/pricing";
import {
  MapPin,
  Plus,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Lock,
} from "lucide-react";
import type { Address, PlaceOrderResponse } from "@/types";

type CheckoutStep = "address" | "summary" | "payment";

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { cart, itemCount, refreshCart } = useCart();

  const [step, setStep] = useState<CheckoutStep>("address");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddressesLoading, setIsAddressesLoading] = useState(true);

  // New address modal state
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [newLine2, setNewLine2] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI" | "CARD" | "NET_BANKING">("COD");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    let active = true;
    if (!isAuthLoading && !user) {
      router.push("/login?redirect=/checkout");
    } else if (user) {
      api<{ items: Address[] }>("/addresses")
        .then(({ items: data }) => {
          if (active) {
            setAddresses(data);
            const defaultAddr = data.find((a) => a.isDefault) || data[0];
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          }
        })
        .catch(() => {
          toast.error("Failed to load addresses");
        })
        .finally(() => {
          if (active) setIsAddressesLoading(false);
        });

      refreshCart();
    }

    return () => {
      active = false;
    };
  }, [user, isAuthLoading, router, refreshCart, toast]);

  const items = cart?.items ?? [];
  const summary = cart?.summary;

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressErrors({});

    const errs: Record<string, string> = {};
    if (!newFullName.trim()) errs.fullName = "Name is required";
    if (!/^[6-9]\d{9}$/.test(newMobile.trim())) errs.mobile = "10-digit mobile required";
    if (!newLine1.trim()) errs.line1 = "Address line 1 is required";
    if (!newCity.trim()) errs.city = "City is required";
    if (!newState.trim()) errs.state = "State is required";
    if (!/^\d{6}$/.test(newPincode.trim())) errs.pincode = "6-digit PIN code required";

    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      return;
    }

    setIsSavingAddress(true);
    try {
      const created = await api<Address>("/addresses", {
        method: "POST",
        body: JSON.stringify({
          fullName: newFullName.trim(),
          mobile: newMobile.trim(),
          line1: newLine1.trim(),
          line2: newLine2.trim() || null,
          landmark: newLandmark.trim() || null,
          city: newCity.trim(),
          state: newState.trim(),
          pincode: newPincode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      toast.success("Address added");
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add address";
      toast.error(message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a shipping address");
      setStep("address");
      return;
    }

    setIsPlacingOrder(true);
    setOrderError("");

    const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const res = await api<PlaceOrderResponse>("/orders", {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
          couponCode: cart?.coupon?.code,
        }),
      });

      toast.success("Order confirmed successfully!");
      router.push(`/checkout/success/${res.orderNumber}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setOrderError(err.message || "Could not complete order placement");
        toast.error(err.message || "Order placement failed");
      } else {
        const message = err instanceof Error ? err.message : "An unexpected error occurred while placing order.";
        setOrderError(message);
        toast.error(message);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isAuthLoading || (user && items.length === 0 && !isPlacingOrder)) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-ink/60">
          Preparing checkout…
        </p>
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Checkout Stepper Bar */}
      <div className="mx-auto max-w-3xl mb-10">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
          <div
            onClick={() => setStep("address")}
            className={`flex items-center gap-2 cursor-pointer ${
              step === "address" ? "text-ink" : "text-ink/40 hover:text-ink"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === "address" ? "bg-ink text-gold-300" : "bg-sage-200 text-ink"
              }`}
            >
              1
            </span>
            <span className="hidden sm:inline">Shipping Address</span>
          </div>

          <div className="h-px flex-1 bg-sage-200 mx-4" />

          <div
            onClick={() => selectedAddressId && setStep("summary")}
            className={`flex items-center gap-2 ${
              selectedAddressId ? "cursor-pointer" : "opacity-40"
            } ${step === "summary" ? "text-ink" : "text-ink/40 hover:text-ink"}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === "summary" ? "bg-ink text-gold-300" : "bg-sage-200 text-ink"
              }`}
            >
              2
            </span>
            <span className="hidden sm:inline">Order Summary</span>
          </div>

          <div className="h-px flex-1 bg-sage-200 mx-4" />

          <div
            onClick={() => selectedAddressId && setStep("payment")}
            className={`flex items-center gap-2 ${
              selectedAddressId ? "cursor-pointer" : "opacity-40"
            } ${step === "payment" ? "text-ink" : "text-ink/40 hover:text-ink"}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === "payment" ? "bg-ink text-gold-300" : "bg-sage-200 text-ink"
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Payment (COD)</span>
          </div>
        </div>
      </div>

      {orderError && (
        <div className="mx-auto max-w-3xl mb-6 rounded-md bg-sale/10 border border-sale/30 p-3 text-xs text-sale">
          {orderError}
        </div>
      )}

      {/* Main Checkout Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Shipping Address */}
          {step === "address" && (
            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-sage-200 pb-4 mb-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    Select Delivery Destination
                  </h2>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Choose where we should deliver your order.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewAddressModalOpen(true)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Address
                </Button>
              </div>

              {isAddressesLoading ? (
                <div className="py-8 text-center text-xs text-ink/60">
                  Loading saved addresses…
                </div>
              ) : addresses.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink/70">
                  <p>You have no saved addresses yet.</p>
                  <div className="mt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsNewAddressModalOpen(true)}
                    >
                      Add Shipping Address
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3.5 rounded-xl border p-4 cursor-pointer transition ${
                          isSelected
                            ? "border-gold-500 bg-sage-50/60 shadow-xs"
                            : "border-sage-200 bg-white hover:border-sage-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 accent-ink cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">
                              {addr.fullName}
                            </span>
                            {addr.isDefault && (
                              <Badge variant="gold" size="sm">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-ink/75 leading-relaxed">
                            {addr.line1}
                            {addr.line2 && <>, {addr.line2}</>}
                            {addr.landmark && <>, Near {addr.landmark}</>}
                            <br />
                            {addr.city}, {addr.state} — <strong>{addr.pincode}</strong>
                          </p>
                          <p className="mt-2 text-[11px] text-ink/60">
                            Mobile: {addr.mobile}
                          </p>
                        </div>
                      </label>
                    );
                  })}

                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={!selectedAddressId}
                      onClick={() => setStep("summary")}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Continue to Review
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Order Summary */}
          {step === "summary" && (
            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
              <div className="border-b border-sage-200 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink">
                    Review Your Wardrobe ({itemCount} items)
                  </h2>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Please verify your items and delivery destination before payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("address")}
                  className="text-xs text-gold-600 font-semibold hover:text-ink cursor-pointer"
                >
                  Change Address
                </button>
              </div>

              {/* Delivery destination snippet */}
              {selectedAddress && (
                <div className="mb-6 rounded-lg bg-sage-50 border border-sage-200 p-4 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-ink mb-1">
                    <MapPin className="h-4 w-4 text-gold-600" />
                    <span>Delivering to {selectedAddress.fullName}</span>
                  </div>
                  <p className="text-ink/70">
                    {selectedAddress.line1}, {selectedAddress.city},{" "}
                    {selectedAddress.state} — {selectedAddress.pincode}
                  </p>
                </div>
              )}

              {/* Item rows */}
              <div className="divide-y divide-sage-200">
                {items.map((item) => {
                  const product = item.variant.product;
                  const image = product.images?.[0];

                  return (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0">
                      <div className="relative h-20 w-16 overflow-hidden rounded bg-sage-100 shrink-0 border border-sage-200">
                        {image?.url ? (
                          <FadeImage src={image.url} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-ink/40">
                            Photo
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between text-xs">
                        <div>
                          <h4 className="font-medium text-ink sm:text-sm">
                            {product.name}
                          </h4>
                          <p className="text-ink/60 text-[11px] mt-0.5">
                            Size: {item.variant.size} • Color: {item.variant.color} •
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right font-semibold text-ink">
                          {formatPrice(item.lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-sage-200 pt-4 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("address")}
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                >
                  Back to Address
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setStep("payment")}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method */}
          {step === "payment" && (
            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
              <div className="border-b border-sage-200 pb-4 mb-6">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Payment Method
                </h2>
                <p className="text-xs text-ink/60 mt-0.5">
                  Select your preferred mode of settlement.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Cash on Delivery (Active) */}
                <label className="flex items-start gap-3.5 rounded-xl border border-gold-500 bg-sage-50/70 p-4 cursor-pointer shadow-xs">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    className="mt-1 accent-ink"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-ink">
                        <Banknote className="h-4 w-4 text-gold-600" />
                        <span>Cash on Delivery (COD)</span>
                      </div>
                      <Badge variant="sage" size="sm">
                        Available
                      </Badge>
                    </div>
                    <p className="mt-1 text-ink/70 text-[11px] leading-relaxed">
                      Pay cash or UPI to the delivery courier when your package
                      arrives at your doorstep.
                    </p>
                  </div>
                </label>

                {/* UPI (Disabled / Coming soon) */}
                <div className="flex items-start gap-3.5 rounded-xl border border-sage-200 bg-white/60 p-4 opacity-50 cursor-not-allowed">
                  <input type="radio" disabled className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <Smartphone className="h-4 w-4 text-ink/50" />
                        <span>UPI / QR (Google Pay, PhonePe, Paytm)</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        Gateway Coming Soon
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-ink/50">
                      Digital gateway integration will launch soon.
                    </p>
                  </div>
                </div>

                {/* Credit / Debit Card (Disabled / Coming soon) */}
                <div className="flex items-start gap-3.5 rounded-xl border border-sage-200 bg-white/60 p-4 opacity-50 cursor-not-allowed">
                  <input type="radio" disabled className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <CreditCard className="h-4 w-4 text-ink/50" />
                        <span>Credit / Debit Card (Visa, Mastercard, RuPay)</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        Gateway Coming Soon
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Net Banking (Disabled / Coming soon) */}
                <div className="flex items-start gap-3.5 rounded-xl border border-sage-200 bg-white/60 p-4 opacity-50 cursor-not-allowed">
                  <input type="radio" disabled className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        <Building2 className="h-4 w-4 text-ink/50" />
                        <span>Net Banking (All Indian Banks)</span>
                      </div>
                      <Badge variant="outline" size="sm">
                        Gateway Coming Soon
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-sage-200 pt-4 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("summary")}
                  leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                >
                  Back to Summary
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isPlacingOrder}
                  onClick={handlePlaceOrder}
                  leftIcon={<Lock className="h-4 w-4" />}
                >
                  Place Order with COD
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4">
          {summary && (
            <div className="sticky top-28 rounded-xl border border-sage-200 bg-white p-5 shadow-xs text-xs space-y-3">
              <h3 className="font-semibold uppercase tracking-wider text-ink mb-4">
                Order Total
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
                  <span>Coupon Discount ({cart?.coupon?.code})</span>
                  <span>-{formatPrice(summary.couponDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-ink/75">
                <span>Delivery Charge</span>
                <span>
                  {summary.deliveryCharge === 0 ? (
                    <strong className="text-sage-600">FREE</strong>
                  ) : (
                    formatPrice(summary.deliveryCharge)
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-sage-200 pt-3 text-sm font-semibold text-ink">
                <span>Final Payable</span>
                <span>{formatPrice(summary.total)}</span>
              </div>

              <p className="mt-4 border-t border-sage-200 pt-4 text-sm text-ink/70">
                You pay in cash when your order is delivered.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      <Modal
        isOpen={isNewAddressModalOpen}
        onClose={() => setIsNewAddressModalOpen(false)}
        title="Add Delivery Address"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAddress} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Recipient Full Name"
              placeholder="Ananya Rao"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              error={addressErrors.fullName}
            />
            <Input
              label="10-Digit Mobile"
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={newMobile}
              onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ""))}
              error={addressErrors.mobile}
            />
          </div>

          <Input
            label="Street Address / Flat / Building (Line 1)"
            placeholder="Flat 402, Lotus Residency, MG Road"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            error={addressErrors.line1}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Apartment, Suite (Optional)"
              placeholder="Block B"
              value={newLine2}
              onChange={(e) => setNewLine2(e.target.value)}
            />
            <Input
              label="Landmark (Optional)"
              placeholder="Near City Mall"
              value={newLandmark}
              onChange={(e) => setNewLandmark(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="Bengaluru"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              error={addressErrors.city}
            />
            <Input
              label="State"
              placeholder="Karnataka"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              error={addressErrors.state}
            />
            <Input
              label="PIN Code"
              type="text"
              maxLength={6}
              placeholder="560001"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ""))}
              error={addressErrors.pincode}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sage-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNewAddressModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingAddress}
            >
              Save Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
