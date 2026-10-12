import { Suspense } from "react";
import { AuditLogView } from "@/components/admin/ops/audit/AuditLogView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Audit log" };

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AuditLogView />
    </Suspense>
  );
}
