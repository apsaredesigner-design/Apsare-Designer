import React from "react";

const MARQUEE_ITEMS = [
  "Festive Sale — Up to 50% Off",
  "Use Code FESTIVE20 for an Extra 20% Off",
  "Free Shipping on Orders Above ₹1,999",
  "Handwoven Sarees & Festive Silks",
  "Cash on Delivery Available Pan-India",
];

/**
 * Slow, pausable ticker along the hero's bottom edge. Duplicated once so the track can loop
 * seamlessly at -50% translate; animation is transform-only (no layout thrashing) and is
 * disabled outright under prefers-reduced-motion via the `.animate-marquee` rule in globals.css.
 */
function MarqueeTrack() {
  return (
    <div className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item, idx) => (
        <span key={idx} className="flex items-center whitespace-nowrap px-6 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300 sm:text-sm">
            {item}
          </span>
          <span className="ml-6 text-gold-500/60 sm:ml-8" aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

export function HeroMarquee() {
  return (
    <div className="group relative w-full overflow-hidden border-t border-gold-500/20 bg-ink py-3">
      <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
        <MarqueeTrack />
        {/* Duplicate track enables the seamless -50% loop; screen readers only need it once. */}
        <div aria-hidden="true">
          <MarqueeTrack />
        </div>
      </div>
    </div>
  );
}
