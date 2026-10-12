import { Skeleton } from "@/components/admin/Skeleton";

/** Shown inside the admin shell while a panel page's server component loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-px w-12" />
      <Skeleton className="mt-4 h-4 w-80 max-w-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-80 rounded-xl" />
    </div>
  );
}
