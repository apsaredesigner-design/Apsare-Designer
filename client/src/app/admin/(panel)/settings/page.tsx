import { Suspense } from "react";
import { PageFallback } from "@/components/admin/shared/PageFallback";
import { SettingsView } from "@/components/admin/ops/settings/SettingsView";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <SettingsView />
    </Suspense>
  );
}
