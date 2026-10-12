"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { BRAND } from "@/lib/constants";
import { luxuryEase } from "@/lib/motion";

const SESSION_KEY = "apsare_preloader_seen";

export function Preloader() {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setLoading(false);
        return;
      }
    } catch {
      // Safe fallback
    }

    const timer = setTimeout(() => {
      setLoading(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
      } catch {
        // Safe fallback in restricted storage contexts
      }
    }, 1350);

    return () => clearTimeout(timer);
  }, []);

  if (!loading) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {loading && (
        <motion.div
          key="brand-luxury-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.01,
            filter: "blur(4px)",
            transition: { duration: 0.55, ease: luxuryEase },
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ivory/98 backdrop-blur-md select-none overflow-hidden"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Subtle ambient golden background glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1.15 }}
            transition={{ duration: 1.2, ease: luxuryEase }}
            className="pointer-events-none absolute h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-gold-400/20 via-gold-300/10 to-transparent blur-3xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: luxuryEase }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            {/* High-Resolution Brand Lotus & Monogram */}
            <div className="relative mb-3 flex items-center justify-center">
              <Image
                src={BRAND.logoDark}
                alt={BRAND.name}
                width={170}
                height={122}
                priority
                className="h-24 sm:h-28 w-auto object-contain drop-shadow-md"
              />
            </div>

            {/* Elegant center-expanding golden hairline indicator */}
            <div className="relative mt-2 h-[1.5px] w-28 overflow-hidden rounded-full bg-sage-200/80">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 1.15,
                  ease: [0.65, 0, 0.35, 1],
                }}
                className="h-full w-full origin-left bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300 shadow-xs"
              />
            </div>

            {/* Editorial brand heritage subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: luxuryEase }}
              className="mt-3.5 text-[10px] uppercase tracking-[0.3em] text-ink/65 font-medium"
            >
              Handcrafted Indian Elegance
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
