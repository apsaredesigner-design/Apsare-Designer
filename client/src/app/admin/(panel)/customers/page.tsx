import { Suspense } from "react";
import { CustomersView } from "@/components/admin/ops/customers/CustomersView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <CustomersView />
    </Suspense>
  );
}
