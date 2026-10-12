"use client";

import React, { useEffect, useRef, useState } from "react";

export interface FadeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Classes for the wrapper span that fills the nearest relative, sized ancestor
   * (the same contract `next/image`'s `fill` prop had). Rarely needed — the
   * placeholder background lives here.
   */
  wrapperClassName?: string;
}

/**
 * FadeImage: fills its nearest `relative`, sized ancestor — the same contract
 * `next/image`'s `fill` prop had — with a plain <img> (no next/image; a deliberate
 * project choice, see client/AGENTS.md) that cross-fades in from a `bg-sage-100`
 * placeholder once loaded, instead of popping in. Skips the fade under
 * prefers-reduced-motion. Pass any extra classes (object position, hover
 * cross-fade opacity, hover scale, etc.) via `className`, same as you would have
 * on `<Image fill className="..." />`.
 *
 *   <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-sage-100">
 *     <FadeImage src={img.url} alt={product.name} loading="lazy" className="object-top" />
 *   </div>
 */
export function FadeImage({
  className = "",
  wrapperClassName = "",
  onLoad,
  loading = "lazy",
  decoding = "async",
  alt = "",
  ...props
}: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached image can finish loading before this effect's ref is attached and
  // before React binds the `onLoad` listener below, so the `load` event never
  // fires and the image stays stuck at `opacity: 0` (invisible until something
  // else, e.g. a hover-triggered sibling, repaints over it). Catch that case
  // directly via the image's own `complete` flag, and reset when `src` changes.
  useEffect(() => {
    setLoaded(imgRef.current?.complete ?? false);
  }, [props.src]);

  return (
    // The placeholder background must drop once loaded, not stay on permanently: when a caller
    // stacks two FadeImages (e.g. a primary + hover-swap secondary), an always-opaque wrapper on
    // the top layer paints over the layer below regardless of the inner <img>'s own opacity.
    <span className={`absolute inset-0 block overflow-hidden ${loaded ? "" : "bg-sage-100"} ${wrapperClassName}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- manual <img>: this project deliberately doesn't use next/image (see AGENTS.md) */}
      <img
        ref={imgRef}
        {...props}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        // Forced inline until load so it always wins over any opacity utility in
        // `className` (e.g. a hover cross-fade's `opacity-0 group-hover:opacity-100`);
        // removed afterwards so those classes behave exactly as the caller intended.
        style={loaded ? undefined : { opacity: 0 }}
        className={`size-full object-cover transition duration-[350ms] motion-reduce:transition-none ${className}`}
      />
    </span>
  );
}
