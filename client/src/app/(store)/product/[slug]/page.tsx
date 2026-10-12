import React from "react";
import { notFound } from "next/navigation";
import { getProduct, getReviews, getSimilar } from "@/server/queries";
import { HttpError } from "@/server/utils/http-error";
import { ProductView } from "@/components/product/ProductView";
import { ProductRail } from "@/components/store/ProductRail";
import type { Product, Review, Paginated, ProductSummary } from "@/types";

// Always rendered per request (the old fetches were cache: "no-store").
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: product.name,
      description:
        product.description.slice(0, 160) ||
        `Shop ${product.name} from Label Apsáre's handcrafted luxury collection.`,
      openGraph: {
        images: product.images[0]?.url ? [product.images[0].url] : [],
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product: Product;
  let reviews: Paginated<Review> = {
    items: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false },
  };
  let similarProducts: ProductSummary[] = [];

  try {
    product = await getProduct(slug);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  try {
    reviews = await getReviews(slug, "limit=10");
  } catch {}

  try {
    similarProducts = await getSimilar(slug);
  } catch {}

  return (
    <div>
      <ProductView product={product} reviews={reviews} />

      {/* Similar products rail */}
      {similarProducts.length > 0 && (
        <div className="border-t border-sage-200 mt-16 bg-sage-50/40">
          <ProductRail
            title="Complete the Wardrobe"
            subtitle="Patrons Also Admired"
            products={similarProducts}
            viewAllHref={`/category/${product.category.slug}`}
          />
        </div>
      )}
    </div>
  );
}
