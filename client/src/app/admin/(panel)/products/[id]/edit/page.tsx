import { EditProductView } from "@/components/admin/catalog/product-form/EditProductView";

export const metadata = { title: "Edit product" };

export default async function Page(props: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await props.params;
  return <EditProductView id={Number(id)} />;
}
