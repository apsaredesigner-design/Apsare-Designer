import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "sale" | "gold" | "sage" | "outline" | "ink";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-sage-100 text-sage-700 border border-sage-200",
    sale: "bg-sale text-white font-semibold",
    gold: "bg-gold-500/15 text-gold-700 border border-gold-500/30",
    sage: "bg-sage-400 text-ink font-medium",
    outline: "border border-ink/30 text-ink bg-transparent",
    ink: "bg-ink text-gold-300",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] tracking-wider uppercase",
    md: "px-2.5 py-1 text-xs tracking-wider uppercase",
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
