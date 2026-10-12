import { Suspense } from "react";
import { ProductsView } from "@/components/admin/catalog/products/ProductsView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Products" };

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ProductsView />
    </Suspense>
  );
}
