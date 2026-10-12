/** Suspense fallback for every admin list page (useAdminList reads useSearchParams, which needs a boundary). */
import { Skeleton } from "@/components/admin/Skeleton";

export function PageFallback() {
  return (
    <div role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-4 h-4 w-80 max-w-full" />
      <Skeleton className="mt-10 h-12 w-full rounded-lg" />
      <Skeleton className="mt-4 h-96 rounded-xl" />
    </div>
  );
}
