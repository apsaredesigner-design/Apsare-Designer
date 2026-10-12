import React from "react";
import { listProducts } from "@/server/queries";
import { ProductListing } from "@/components/product/ProductListing";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "Shop All Collections",
  description: "Browse the complete curation of sarees, blouses, and ethnic ensembles by Label Apsáre.",
};

export default async function ShopPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedParams).forEach(([k, v]) => {
    if (v && typeof v === "string") {
      params.set(k, v);
    }
  });

  const data = await listProducts(params);

  return (
    <ProductListing
      initialData={data}
      title="All Collections"
      subtitle="The Complete Archive"
    />
  );
}
