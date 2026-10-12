"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/pricing";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import {
  ArrowLeft,
  Clock,
  Package,
  Truck,
  Home,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";

export default function OrderDetailPage() {
  const params = useParams();
  const toast = useToast();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await api<Order>(`/orders/${orderNumber}`);
      setOrder(data);
    } catch {
      toast.error("Failed to load order details");
    }
  }, [orderNumber, toast]);

  useEffect(() => {
    let active = true;
    api<Order>(`/orders/${orderNumber}`)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch(() => {
        toast.error("Failed to load order details");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderNumber, toast]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order? This action cannot be reversed.")) {
      return;
    }
    setIsCancelling(true);
    try {
      await api(`/orders/${orderNumber}/cancel`, { method: "POST" });
      toast.success("Order cancelled successfully");
      await loadOrder();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel order";
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-sage-200 bg-white p-6 space-y-3">
          <Skeleton variant="text" className="h-3 w-32" />
          <Skeleton variant="text" className="h-6 w-48" />
        </div>
        <div className="rounded-xl border border-sage-200 bg-white p-6 space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-24 w-18 shrink-0 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-3 w-1/2" />
                <Skeleton variant="text" className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-sage-200 bg-white p-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-sale mb-3" />
        <h3 className="font-display text-xl font-semibold text-ink">
          Order Not Found
        </h3>
        <p className="text-xs text-ink/60 mt-1">
          We could not find an order matching #{orderNumber}.
        </p>
        <div className="mt-6">
          <Link href="/account/orders">
            <Button variant="outline" size="sm">
              Back to My Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = order.status === "PLACED" || order.status === "CONFIRMED";

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "PLACED":
      case "CONFIRMED":
        return <Clock className="h-4 w-4" />;
      case "PACKED":
        return <Package className="h-4 w-4" />;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Truck className="h-4 w-4" />;
      case "DELIVERED":
        return <Home className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Orders</span>
          </Link>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Order #{order.orderNumber}
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={
              order.status === "DELIVERED"
                ? "sage"
                : order.status === "CANCELLED"
                ? "sale"
                : "gold"
            }
            size="md"
          >
            {ORDER_STATUS_LABEL[order.status] || order.status}
          </Badge>

          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              onClick={handleCancel}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Status History Timeline */}
      <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <h3 className="font-display text-lg font-semibold text-ink mb-6">
          Delivery Timeline
        </h3>

        <div className="relative pl-6 space-y-6 border-l-2 border-sage-200 ml-3">
          {order.statusHistory.map((event, idx) => {
            const isLast = idx === order.statusHistory.length - 1;
            return (
              <div key={event.id} className="relative">
                <div
                  className={`absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    isLast
                      ? "border-gold-500 bg-gold-500 text-ink shadow-sm"
                      : "border-sage-300 bg-white text-ink/60"
                  }`}
                >
                  {getStatusIcon(event.status)}
                </div>

                <div>
                  <p className="text-xs font-semibold text-ink">
                    {ORDER_STATUS_LABEL[event.status] || event.status}
                  </p>
                  {event.note && (
                    <p className="text-xs text-ink/70 mt-0.5">{event.note}</p>
                  )}
                  <p className="text-[10px] text-ink/40 mt-1">
                    {new Date(event.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-column: Items left, Address & Summary right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-7 rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
          <h3 className="font-display text-lg font-semibold text-ink mb-4">
            Items in this Shipment ({order.items.length})
          </h3>

          <div className="divide-y divide-sage-200">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative h-24 w-18 overflow-hidden rounded bg-sage-100 shrink-0 border border-sage-200">
                  {item.imageUrl ? (
                    <FadeImage src={item.imageUrl} alt={item.productName} loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-ink/40">
                      Photo
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between text-xs">
                  <div>
                    <h4 className="font-medium text-ink text-sm">
                      {item.productName}
                    </h4>
                    <p className="text-ink/60 mt-0.5">
                      Code: {item.productCode} • Size: {item.size} • Color: {item.color}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-sage-200/60 pt-2 mt-2">
                    <span className="text-ink/60">
                      Qty: {item.quantity} × {formatPrice(item.salePrice)}
                    </span>
                    <span className="font-semibold text-ink">
                      {formatPrice(item.salePrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Address & Payment Summary */}
        <div className="lg:col-span-5 space-y-6">
          {/* Shipping Address */}
          <div className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-ink mb-2">
              Shipping Destination
            </h4>
            <p className="font-semibold text-sm text-ink">{order.shipName}</p>
            <p className="text-ink/75 leading-relaxed mt-1">
              {order.shipLine1}
              {order.shipLine2 && <>, {order.shipLine2}</>}
              {order.shipLandmark && <>, Near {order.shipLandmark}</>}
              <br />
              {order.shipCity}, {order.shipState} — <strong>{order.shipPincode}</strong>
            </p>
            <p className="mt-2 text-ink/60">Contact: {order.shipMobile}</p>
          </div>

          {/* Pricing Breakdown */}
          <div className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs text-xs space-y-2.5">
            <h4 className="font-semibold uppercase tracking-wider text-ink mb-3">
              Payment Summary
            </h4>

            <div className="flex justify-between text-ink/70">
              <span>Total MRP</span>
              <span>{formatPrice(order.totalMrp)}</span>
            </div>

            {order.totalDiscount > 0 && (
              <div className="flex justify-between text-sage-600 font-medium">
                <span>Discount on MRP</span>
                <span>-{formatPrice(order.totalDiscount)}</span>
              </div>
            )}

            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-sage-600 font-medium">
                <span>Coupon ({order.coupon?.code || "Applied"})</span>
                <span>-{formatPrice(order.couponDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-ink/70">
              <span>Delivery Fee</span>
              <span>
                {order.deliveryCharge === 0 ? "FREE" : formatPrice(order.deliveryCharge)}
              </span>
            </div>

            <div className="flex justify-between border-t border-sage-200 pt-2.5 font-semibold text-sm text-ink">
              <span>Final Amount</span>
              <span>{formatPrice(order.finalAmount)}</span>
            </div>

            <div className="mt-4 rounded-md bg-sage-50 p-3 text-[11px] text-ink/70 border border-sage-200">
              Payment Method: <strong>{order.paymentMethod}</strong> (Status:{" "}
              <strong>{order.paymentStatus}</strong>)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
