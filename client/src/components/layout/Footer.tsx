import Link from "next/link";
import { BRAND, NAV_CATEGORIES } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Sparkles, ShieldCheck, Truck } from "lucide-react";

const SHOP_LINKS = [
  ...NAV_CATEGORIES,
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Offers", href: "/offers" },
];

const HELP_LINKS = [
  { label: "Contact us", href: "/contact" },
  { label: "Track an order", href: "/account/orders" },
  { label: "Your account", href: "/account" },
  { label: "About us", href: "/about" },
];

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <p className="text-xs uppercase tracking-[0.2em] font-semibold text-gold-400">
        {title}
      </p>
      <ul className="mt-3.5 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block text-[14px] text-ivory/85 transition-colors hover:text-gold-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-sage-700 text-ivory border-t border-sage-600/60">
      {/* Brand value badge strip */}
      <div className="border-b border-sage-600/70 bg-sage-800/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Sparkles className="h-4 w-4 text-gold-400 shrink-0" />
              <p className="text-xs tracking-wider uppercase text-sage-100 font-medium">
                Artisanal Handlooms & Pure Silks
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Truck className="h-4 w-4 text-gold-400 shrink-0" />
              <p className="text-xs tracking-wider uppercase text-sage-100 font-medium">
                Complimentary Shipping Above ₹1,999
              </p>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <ShieldCheck className="h-4 w-4 text-gold-400 shrink-0" />
              <p className="text-xs tracking-wider uppercase text-sage-100 font-medium">
                Cash On Delivery Available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <Link
              href="/"
              className="inline-block mb-6 focus-visible:outline-2 focus-visible:outline-gold-300 rounded"
              aria-label={`${BRAND.name} — Home`}
            >
              <BrandLogo variant="light" size="lg" />
            </Link>
            <p className="max-w-[28ch] font-display text-2xl leading-snug text-ivory sm:text-3xl lg:text-[2.25rem]">
              Crafted for her modern aesthetic, steeped in timeless Indian craft.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-sage-200">
              Handpicked sarees, lehengas, blouses and festive coordinates curated
              for weddings, rituals, and celebratory evenings across India.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-12 pt-2">
            <LinkColumn title="Collections" links={SHOP_LINKS} />
            <LinkColumn title="Client Care" links={HELP_LINKS} />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-gold-500/30 pt-6 sm:flex-row sm:items-center sm:justify-between text-xs text-sage-300">
          <p className="tracking-wide">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sage-300">
            <Link href="/privacy" className="hover:text-gold-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gold-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/shipping" className="hover:text-gold-300 transition-colors">
              Shipping & Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
