import React from "react";
import { listProducts } from "@/server/queries";
import { ProductListing } from "@/components/product/ProductListing";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
  title: "Search Results",
  description: "Search sarees, fabrics, and ethnic ensembles by Label Apsáre.",
};

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q.trim() : "";

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Search our Collection"
          description="Enter keywords like 'Kanjivaram Silk', 'Festive Lehenga', or product codes to discover our creations."
          actionLabel="Browse All Sarees"
          actionHref="/category/sarees"
        />
      </div>
    );
  }

  const queryParams = new URLSearchParams();
  queryParams.set("q", q);

  Object.entries(resolvedParams).forEach(([k, v]) => {
    if (k !== "q" && v && typeof v === "string") {
      queryParams.set(k, v);
    }
  });

  const data = await listProducts(queryParams);

  return (
    <ProductListing
      initialData={data}
      title={`Search: "${q}"`}
      subtitle="Search Results"
      searchQuery={q}
      forcedQueryParam={{ q }}
    />
  );
}
