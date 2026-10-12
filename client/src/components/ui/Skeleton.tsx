import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text";
}

export function Skeleton({
  variant = "rectangular",
  className = "",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rectangular: "rounded-md",
    circular: "rounded-full",
    text: "h-4 rounded",
  }[variant];

  return (
    <div
      className={`animate-pulse bg-sage-200/60 ${variantStyles} ${className}`}
      {...props}
    />
  );
}
