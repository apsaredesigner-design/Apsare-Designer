import type { Metadata } from "next";
import { OrderDetailView } from "@/components/admin/ops/orders/OrderDetailView";

export async function generateMetadata(props: PageProps<"/admin/orders/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await props.params;
  return { title: `Order ${decodeURIComponent(orderNumber)}` };
}

export default async function OrderDetailPage(props: PageProps<"/admin/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  return <OrderDetailView orderNumber={decodeURIComponent(orderNumber)} />;
}
