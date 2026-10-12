"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sale/10 text-sale mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>

      <span className="text-[10px] uppercase tracking-[0.4em] text-gold-600 font-semibold">
        Connection Glitch
      </span>

      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Something Went Awry
      </h1>

      <p className="mt-3 text-xs sm:text-sm text-ink/70 leading-relaxed">
        We encountered a momentary snag communicating with our ateliers. Please try
        refreshing the drape collection.
      </p>

      <div className="mt-8">
        <Button
          variant="primary"
          size="md"
          onClick={reset}
          leftIcon={<RotateCcw className="h-4 w-4" />}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
