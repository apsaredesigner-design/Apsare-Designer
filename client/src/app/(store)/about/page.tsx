import React from "react";
import Link from "next/link";
import { Sparkles, Heart, ShieldCheck, Feather } from "lucide-react";
import { FadeImage } from "@/components/store/FadeImage";

export const metadata = {
  title: "Our Heritage & Story",
  description:
    "Discover the vision behind Label Apsáre — honoring indigenous Indian handlooms through contemporary luxury drape aesthetics.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Header */}
      <section className="bg-sage-400 py-16 sm:py-24 text-ink">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="text-xs uppercase tracking-[0.4em] text-ink/75 font-semibold">
            Artisanal Legacy
          </span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-wide sm:text-6xl leading-tight">
            Crafted for her modern aesthetic.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-ink/85 leading-relaxed max-w-2xl mx-auto">
            Label Apsáre was conceived at the confluence of India’s deepest textile
            traditions and the quiet confidence of the modern woman.
          </p>
        </div>
      </section>

      {/* Main Narrative */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl bg-sage-100">
            <FadeImage
              src="/images/banners/banner-saree.jpg"
              alt="Artisan weaving drape"
              loading="eager"
              className="object-top"
            />
          </div>

          <div className="lg:col-span-6 space-y-6 text-sm text-ink/80 leading-relaxed">
            <span className="text-xs uppercase tracking-[0.3em] text-gold-600 font-semibold">
              The Genesis
            </span>
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              An ode to the timeless drape
            </h2>
            <p>
              In an era of fleeting fast fashion, Label Apsáre is a deliberate pause.
              We believe a saree is not merely six yards of fabric—it is an heirloom of
              identity, a canvas of ancestral memory, and an intimate celebration of femininity.
            </p>
            <p>
              Every motif in our collection carries historical provenance: from the sacred
              kalyan temple borders of Tamil Nadu to the subtle, featherlight gossamer
              organza weaves of Varanasi. We collaborate directly with master artisan
              clusters across India, ensuring equitable livelihoods and the preservation
              of intricate handloom crafts that span generations.
            </p>
            <div className="border-l-2 border-gold-500 pl-4 py-1 italic font-display text-base text-ink">
              &ldquo;We design not for a season, but for a lifetime of heirloom handovers.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* Brand Pillars */}
      <section className="bg-sage-50 border-y border-sage-200 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[10px] uppercase tracking-[0.35em] text-gold-600 font-semibold">
              Our Commitments
            </span>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
              The Apsáre Standard
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-gold-600 mb-4">
                <Feather className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink mb-2">
                Pure Natural Fibres
              </h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                From mulberry and tussar silks to breathable hand-spun cottons, we never
                compromise on authentic textile handfeel.
              </p>
            </div>

            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-gold-600 mb-4">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink mb-2">
                Artisan Equity
              </h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                We empower craft clusters with transparent, fair compensation, fostering
                economic sustainability for generational weavers.
              </p>
            </div>

            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-gold-600 mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink mb-2">
                Modern Silhouette
              </h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                Silhouettes engineered for comfortable drapes, effortless movement, and
                flawless day-to-night celebratory transitions.
              </p>
            </div>

            <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-xs text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-gold-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink mb-2">
                Heirloom Longevity
              </h3>
              <p className="text-xs text-ink/70 leading-relaxed">
                Finished with bespoke piping, durable zari threads and signature royal
                packaging designed for generational preservation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Begin Your Drape Journey
        </h2>
        <p className="mt-3 text-xs sm:text-sm text-ink/70 max-w-md mx-auto">
          Explore our latest festive arrivals, hand-picked and ready to dispatch to your
          doorstep.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/shop"
            className="rounded-full bg-ink px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-semibold text-gold-300 hover:bg-sage-700 hover:text-white transition"
          >
            Explore Sarees
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-sage-300 bg-white px-8 py-3.5 text-xs uppercase tracking-[0.2em] font-semibold text-ink hover:border-gold-500 transition"
          >
            Visit Atelier
          </Link>
        </div>
      </section>
    </div>
  );
}
