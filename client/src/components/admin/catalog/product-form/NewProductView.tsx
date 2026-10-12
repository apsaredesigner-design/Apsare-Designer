"use client";
/** /admin/products/new: an empty ProductForm; after the first save it redirects to the edit page. */
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "./ProductForm";

export function NewProductView() {
  return (
    <>
      <PageHeader
        title="New product"
        description="Save as a draft at any time. Publishing needs at least one image and one variant."
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "New" }]}
      />
      <ProductForm />
    </>
  );
}
