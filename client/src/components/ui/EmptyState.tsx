import React from "react";
import Link from "next/link";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-md mx-auto ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100/90 text-sage-600 border border-sage-200/80 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        {title}
      </h3>
      <p className="mt-2 text-sm text-ink/70 leading-relaxed">{description}</p>
      {actionLabel && (
        <div className="mt-8">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary">{actionLabel}</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
