import { Suspense } from "react";
import { BannersView } from "@/components/admin/ops/banners/BannersView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Banners" };

export default function BannersPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <BannersView />
    </Suspense>
  );
}
