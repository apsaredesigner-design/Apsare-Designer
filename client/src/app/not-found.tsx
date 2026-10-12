import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-gold-600 mb-6">
        <Compass className="h-8 w-8" />
      </div>

      <span className="text-[10px] uppercase tracking-[0.4em] text-gold-600 font-semibold">
        404 — Not Found
      </span>

      <h1 className="mt-2 font-display text-4xl font-semibold text-ink sm:text-5xl">
        This Drape Slipped Away
      </h1>

      <p className="mt-4 text-xs sm:text-sm text-ink/70 leading-relaxed max-w-sm">
        The design, collection or page you were seeking may have been archived or moved
        to our private vaults.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button variant="primary" size="md">
            Return to Home
          </Button>
        </Link>
        <Link href="/shop">
          <Button variant="outline" size="md">
            Explore Collections
          </Button>
        </Link>
      </div>
    </div>
  );
}
