/**
 * Skeleton: a pulsing placeholder block (static when prefers-reduced-motion).
 * Size it with classes. Hidden from assistive tech; announce loading elsewhere
 * (e.g. aria-busy on the container).
 *
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="size-10 rounded-full" />
 *   <SkeletonText lines={3} />
 */
import { cx } from "./styles";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block rounded-md bg-ink/[0.07] motion-safe:animate-pulse", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden className={cx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </span>
  );
}
