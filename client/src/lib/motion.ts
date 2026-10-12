import type { Transition, Variants } from "motion/react";

/**
 * Editorial luxury motion easing curves and presets.
 * Designed for Label Apsáre's graceful, high-end aesthetic.
 */

export const luxuryEase = [0.22, 1, 0.36, 1] as const;
export const gentleEase = [0.25, 0.1, 0.25, 1] as const;

export const transitionFast: Transition = {
  duration: 0.2,
  ease: luxuryEase,
};

export const transitionMedium: Transition = {
  duration: 0.4,
  ease: luxuryEase,
};

export const transitionSlow: Transition = {
  duration: 0.7,
  ease: luxuryEase,
};

export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionMedium,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: transitionFast,
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitionMedium,
  },
  exit: {
    opacity: 0,
    transition: transitionFast,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionMedium,
  },
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: luxuryEase },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.2 },
  },
};

export const drawerRightVariants: Variants = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: luxuryEase },
  },
  exit: {
    x: "100%",
    opacity: 0.8,
    transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] },
  },
};

export const drawerBottomVariants: Variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { duration: 0.35, ease: luxuryEase },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] },
  },
};
