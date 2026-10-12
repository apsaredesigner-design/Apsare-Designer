import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, PackageCheck, Truck, ArrowRight } from "lucide-react";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export const metadata = {
  title: "Order Confirmed",
};

export default async function OrderSuccessPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="rounded-2xl border border-sage-200 bg-white p-8 sm:p-12 shadow-sm w-full">
        {/* Success badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sage-100 text-sage-600 mb-6">
          <CheckCircle2 className="h-10 w-10 text-sage-600" />
        </div>

        <span className="text-[10px] uppercase tracking-[0.4em] text-gold-600 font-semibold">
          Order Confirmed
        </span>

        <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
          Thank You for Celebrating With Us
        </h1>

        <div className="mt-4 inline-block rounded-md bg-sage-50 px-4 py-2 border border-sage-200 text-xs">
          Order Reference: <strong className="font-mono text-ink text-sm">{orderNumber}</strong>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-ink/75 leading-relaxed max-w-md mx-auto">
          We have your order and have emailed you a confirmation. We will email you again when it ships.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 text-left border-y border-sage-200/80 py-4 text-xs text-ink/70">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="h-5 w-5 text-gold-600 shrink-0" />
            <div>
              <p className="font-semibold text-ink">Inspected & Packed</p>
              <p className="text-[11px] text-ink/50">In signature royal boxes</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-gold-600 shrink-0" />
            <div>
              <p className="font-semibold text-ink">Cash on Delivery</p>
              <p className="text-[11px] text-ink/50">Pay at your doorstep</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/account/orders/${orderNumber}`}>
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Track Order Status
            </Button>
          </Link>
          <Link href="/shop">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continue Exploring
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
