import { Suspense } from "react";
import { CouponsView } from "@/components/admin/ops/coupons/CouponsView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Coupons" };

export default function CouponsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <CouponsView />
    </Suspense>
  );
}
