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
    await getCategory("new-arrivals");
    return {
      title: "New Arrivals",
      description: "Explore the latest festive edits, modern drapes, and newly launched sarees by Label Apsáre.",
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function NewArrivalsPage({ searchParams }: PageProps) {
  try {
    await getCategory("new-arrivals");
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      notFound();
    }
  }

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

