import { Suspense } from "react";
import { ReviewsView } from "@/components/admin/catalog/reviews/ReviewsView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Reviews" };

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ReviewsView />
    </Suspense>
  );
}
