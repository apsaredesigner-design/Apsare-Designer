import { Suspense } from "react";
import { MessagesView } from "@/components/admin/ops/messages/MessagesView";
import { PageFallback } from "@/components/admin/shared/PageFallback";

export const metadata = { title: "Messages" };

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <MessagesView />
    </Suspense>
  );
}
