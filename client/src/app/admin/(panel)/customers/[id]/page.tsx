import { notFound } from "next/navigation";
import { CustomerDetailView } from "@/components/admin/ops/customers/CustomerDetailView";

export const metadata = { title: "Customer" };

export default async function CustomerDetailPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  return <CustomerDetailView id={n} />;
}
