import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategory, listProducts } from "@/server/queries";
import { HttpError } from "@/server/utils/http-error";
import { ProductListing } from "@/components/product/ProductListing";
import type { CategoryDetail } from "@/types";

// Always rendered per request (the old fetches were cache: "no-store").
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await getCategory(slug);
    return {
      title: `${data.category.name} Collection`,
      description: data.category.description || `Handcrafted ${data.category.name} from Label Apsáre.`,
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedParams = await searchParams;

  let categoryDetail: CategoryDetail | null = null;
  try {
    categoryDetail = await getCategory(slug);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      notFound();
    }
  }

  const queryParams = new URLSearchParams();
  queryParams.set("category", slug);

  Object.entries(resolvedParams).forEach(([k, v]) => {
    if (k !== "category" && v && typeof v === "string") {
      queryParams.set(k, v);
    }
  });

  const productData = await listProducts(queryParams);

  const categoryName = categoryDetail?.category.name || slug;

  return (
    <div>
      {/* Category Breadcrumbs */}
      {categoryDetail?.breadcrumb && categoryDetail.breadcrumb.length > 0 && (
        <div className="bg-sage-50/70 border-b border-sage-200/60 py-2.5 px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl flex items-center gap-1.5 text-xs text-ink/60">
            <Link href="/" className="hover:text-gold-600 transition">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 text-ink/30" />
            <Link href="/shop" className="hover:text-gold-600 transition">
              Shop
            </Link>
            {categoryDetail.breadcrumb.map((crumb, idx) => {
              const isLast = idx === categoryDetail.breadcrumb.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="h-3 w-3 text-ink/30" />
                  {isLast ? (
                    <span className="font-semibold text-ink">{crumb.name}</span>
                  ) : (
                    <Link
                      href={`/category/${crumb.slug}`}
                      className="hover:text-gold-600 transition"
                    >
                      {crumb.name}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      )}

      {/* Child categories sub-nav pills if any */}
      {categoryDetail?.children && categoryDetail.children.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 flex items-center gap-2 overflow-x-auto">
          {categoryDetail.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="rounded-full border border-sage-300 bg-white px-4 py-1.5 text-xs uppercase tracking-wider font-medium text-ink hover:border-gold-500 hover:bg-sage-50 transition whitespace-nowrap"
            >
              {child.name} ({child.productCount})
            </Link>
          ))}
        </div>
      )}

      <ProductListing
        initialData={productData}
        title={categoryName}
        subtitle={categoryDetail?.category.description || "Curated Weaves"}
        categorySlug={slug}
        forcedQueryParam={{ category: slug }}
      />
    </div>
  );
}
