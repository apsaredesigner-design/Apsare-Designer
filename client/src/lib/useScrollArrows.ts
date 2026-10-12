"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Tracks whether a horizontally-scrollable element has more content off-screen in either
 * direction, and exposes a click-to-scroll action. Used by the homepage's card carousels
 * (category strip, product rails) so a row that scrolls only via touch/trackpad drag also
 * has a discoverable, clickable affordance on desktop — and the arrows disappear on their
 * own when a row's items all fit (nothing to scroll to).
 */
export function useScrollArrows(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [ref, update]);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
    },
    [ref]
  );

  return { canScrollLeft, canScrollRight, scrollBy };
}
