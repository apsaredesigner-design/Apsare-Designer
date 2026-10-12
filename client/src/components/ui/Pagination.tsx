"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  createPageUrl?: (page: number) => string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  createPageUrl,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const renderButton = (
    pageNum: number,
    content: React.ReactNode,
    isActive = false,
    disabled = false
  ) => {
    const baseClasses = `h-9 w-9 rounded-full flex items-center justify-center text-xs tracking-wider font-medium transition cursor-pointer ${
      isActive
        ? "bg-ink text-gold-300 font-semibold"
        : "text-ink/80 hover:bg-sage-200/80 hover:text-ink"
    } ${disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`;

    if (createPageUrl && !disabled) {
      return (
        <Link
          key={pageNum}
          href={createPageUrl(pageNum)}
          className={baseClasses}
          aria-current={isActive ? "page" : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={pageNum}
        type="button"
        disabled={disabled}
        onClick={() => onPageChange?.(pageNum)}
        className={baseClasses}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </button>
    );
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex items-center justify-center gap-1.5 py-6 ${className}`}
    >
      {/* Previous button */}
      {renderButton(
        currentPage - 1,
        <ChevronLeft className="h-4 w-4" />,
        false,
        currentPage <= 1
      )}

      {/* Pages */}
      {getPageNumbers().map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="h-9 w-6 flex items-center justify-center text-ink/40 text-xs"
            >
              …
            </span>
          );
        }
        return renderButton(page as number, page, page === currentPage);
      })}

      {/* Next button */}
      {renderButton(
        currentPage + 1,
        <ChevronRight className="h-4 w-4" />,
        false,
        currentPage >= totalPages
      )}
    </nav>
  );
}
