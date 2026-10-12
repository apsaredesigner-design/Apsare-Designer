import React from "react";
import Image from "next/image";
import { BRAND } from "@/lib/constants";

export interface BrandLogoProps {
  variant?: "dark" | "light" | "original";
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

const SIZE_CONFIG = {
  sm: { width: 62, height: 44, container: "h-9 w-auto" },
  md: { width: 78, height: 56, container: "h-11 sm:h-12 w-auto" },
  lg: { width: 110, height: 79, container: "h-16 sm:h-20 w-auto" },
  xl: { width: 160, height: 115, container: "h-24 sm:h-28 w-auto" },
  custom: { width: 110, height: 79, container: "" },
} as const;

export function BrandLogo({
  variant = "dark",
  size = "md",
  priority = false,
  className = "",
  imageClassName = "",
}: BrandLogoProps) {
  const src =
    variant === "light"
      ? BRAND.logoLight
      : variant === "original"
      ? BRAND.logoOriginal
      : BRAND.logoDark;

  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center transition-opacity duration-300 hover:opacity-90 ${config.container} ${className}`}
    >
      <Image
        src={src}
        alt={`${BRAND.name} — ${BRAND.tagline}`}
        width={config.width}
        height={config.height}
        priority={priority}
        className={`h-full w-auto object-contain drop-shadow-xs select-none ${imageClassName}`}
      />
    </div>
  );
}
