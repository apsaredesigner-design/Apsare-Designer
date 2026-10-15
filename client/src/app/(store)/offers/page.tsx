import React from "react";
import { notFound } from "next/navigation";
import { getCategory, listProducts } from "@/server/queries";
import { HttpError } from "@/server/utils/http-error";
import { ProductListing } from "@/components/product/ProductListing";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata() {
  try {
    await getCategory("offers");
    return {
      title: "Exclusive Offers & Deals",
      description: "Special seasonal discounts, promotional prices, and deal-of-the-day curations by Label Apsáre.",
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function OffersPage({ searchParams }: PageProps) {
  try {
    await getCategory("offers");
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      notFound();
    }
  }

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

