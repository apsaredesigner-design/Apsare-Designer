"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { FadeImage } from "@/components/store/FadeImage";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/pricing";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { Package, ChevronRight } from "lucide-react";
import type { Paginated, OrderListItem, OrderStatus } from "@/types";

export default function OrdersPage() {
  const toast = useToast();
  const [ordersData, setOrdersData] = useState<Paginated<OrderListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<Paginated<OrderListItem>>(`/orders?page=${page}&limit=10`)
      .then((res) => {
        if (active) setOrdersData(res);
      })
      .catch(() => {
        toast.error("Failed to load your orders");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, toast]);

  const getStatusBadge = (status: OrderStatus) => {
    const label = ORDER_STATUS_LABEL[status] || status;
    switch (status) {
      case "DELIVERED":
        return <Badge variant="sage">{label}</Badge>;
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
        return <Badge variant="gold">{label}</Badge>;
      case "CANCELLED":
        return <Badge variant="sale">{label}</Badge>;
      default:
        return <Badge variant="default">{label}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs">
        <h2 className="font-display text-2xl font-semibold text-ink">
          My Orders & Wardrobe History
        </h2>
        <p className="text-xs text-ink/60 mt-0.5">
          View shipping progress, delivery timelines and historical invoices.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-sage-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-sage-200/80 pb-3">
                <Skeleton variant="text" className="h-4 w-40" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-14 w-11 rounded" />
                <Skeleton className="h-14 w-11 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !ordersData || ordersData.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sage-300 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-sage-400 mb-3" />
          <h3 className="font-display text-xl font-semibold text-ink">
            No Orders Placed Yet
          </h3>
          <p className="text-xs text-ink/60 mt-1 max-w-sm mx-auto">
            Discover our curated handloom sarees, celebratory silks and modern ethnic ensembles.
          </p>
          <div className="mt-6">
            <Link href="/shop">
              <Button variant="primary" size="md">
                Start Exploring
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {ordersData.items.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs hover:border-gold-400 transition"
            >
              {/* Order header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-200/80 pb-3 text-xs">
                <div>
                  <span className="font-semibold text-ink text-sm">
                    Order #{order.orderNumber}
                  </span>
                  <span className="text-ink/40 ml-2">
                    •{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <span className="font-semibold text-sm text-ink">
                    {formatPrice(order.finalAmount)}
                  </span>
                </div>
              </div>

              {/* Order items row */}
              <div className="py-4">
                <div className="flex flex-wrap gap-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-sage-200 bg-sage-50/50 p-2 text-xs"
                    >
                      <div className="relative h-14 w-11 overflow-hidden rounded bg-sage-200 shrink-0">
                        {item.imageUrl ? (
                          <FadeImage src={item.imageUrl} alt={item.productName} loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-ink/40">
                            Photo
                          </div>
                        )}
                      </div>
                      <div className="max-w-[180px]">
                        <p className="font-medium text-ink truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-ink/60">
                          {item.size} • {item.color} • Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order footer row */}
              <div className="flex items-center justify-between border-t border-sage-200/80 pt-3 text-xs">
                <span className="text-ink/60">
                  Payment: <strong>{order.paymentMethod}</strong> ({order.paymentStatus})
                </span>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="inline-flex items-center gap-1 font-semibold text-gold-600 hover:text-ink transition"
                >
                  <span>View Details & Timeline</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="pt-4">
            <Pagination
              currentPage={ordersData.meta.page}
              totalPages={ordersData.meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
