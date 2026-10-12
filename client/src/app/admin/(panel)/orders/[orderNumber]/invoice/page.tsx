import type { Metadata } from "next";
import { InvoiceView } from "@/components/admin/ops/orders/InvoiceView";

export async function generateMetadata(props: PageProps<"/admin/orders/[orderNumber]/invoice">): Promise<Metadata> {
  const { orderNumber } = await props.params;
  return { title: `Invoice ${decodeURIComponent(orderNumber)}` };
}

export default async function InvoicePage(props: PageProps<"/admin/orders/[orderNumber]/invoice">) {
  const { orderNumber } = await props.params;
  return <InvoiceView orderNumber={decodeURIComponent(orderNumber)} />;
}
