import { Suspense } from "react";
import { OrdersView } from "@/components/admin/ops/orders/OrdersView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <OrdersView />
    </Suspense>
  );
}
