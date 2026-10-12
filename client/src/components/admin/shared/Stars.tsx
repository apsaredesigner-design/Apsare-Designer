/**
 * Stars: a read-only 1–5 star rating with a text equivalent for screen readers.
 *
 *   <Stars rating={4} />
 */
import { StarIcon } from "@/components/admin/icons";
import { cx } from "@/components/admin/styles";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          aria-hidden
          className={cx("size-4", i <= rating ? "fill-gold-500 text-gold-600" : "fill-none text-ink/25")}
        />
      ))}
    </span>
  );
}
