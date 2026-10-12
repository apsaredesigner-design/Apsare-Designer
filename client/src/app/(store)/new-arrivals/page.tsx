import React from "react";
import { listProducts } from "@/server/queries";
import { ProductListing } from "@/components/product/ProductListing";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "New Arrivals",
  description: "Explore the latest festive edits, modern drapes, and newly launched sarees by Label Apsáre.",
};

export default async function NewArrivalsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const queryParams = new URLSearchParams();
  queryParams.set("isNew", "true");

  Object.entries(resolvedParams).forEach(([k, v]) => {
    if (k !== "isNew" && v && typeof v === "string") {
      queryParams.set(k, v);
    }
  });

  const data = await listProducts(queryParams);

  return (
    <ProductListing
      initialData={data}
      title="New Arrivals"
      subtitle="Fresh Off The Looms"
      forcedQueryParam={{ isNew: "true" }}
    />
  );
}
