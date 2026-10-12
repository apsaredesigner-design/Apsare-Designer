import React from "react";
import { listProducts } from "@/server/queries";
import { ProductListing } from "@/components/product/ProductListing";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "Exclusive Offers & Deals",
  description: "Special seasonal discounts, promotional prices, and deal-of-the-day curations by Label Apsáre.",
};

export default async function OffersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const queryParams = new URLSearchParams();
  queryParams.set("deal", "true");

  Object.entries(resolvedParams).forEach(([k, v]) => {
    if (k !== "deal" && v && typeof v === "string") {
      queryParams.set(k, v);
    }
  });

  const data = await listProducts(queryParams);

  return (
    <ProductListing
      initialData={data}
      title="Offers & Festive Deals"
      subtitle="Limited Period Curations"
      forcedQueryParam={{ deal: "true" }}
    />
  );
}
