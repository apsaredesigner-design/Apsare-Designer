"use client";
/** /admin/products/[id]/edit: loads GET /admin/products/:id and renders ProductForm. */
import Link from "next/link";
import { ButtonLink } from "@/components/admin/Button";
import { ExternalIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/Skeleton";
import { Badge } from "@/components/admin/StatusBadge";
import { card, cx } from "@/components/admin/styles";
import { formatDateTime } from "@/lib/admin/format";
import { PRODUCTS_PATH } from "@/lib/admin/helpers/products";
import type { AdminProduct } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";
import { LoadError } from "../../shared/LoadError";
import { ProductForm } from "./ProductForm";

const crumbs = (name: string) => [{ label: "Products", href: "/admin/products" }, { label: name }];

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" aria-busy aria-label="Loading product">
      <div className="flex flex-col gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cx(card, "space-y-4 p-6")}>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </div>
        ))}
      </div>
      <div className={cx(card, "h-64 p-6")}>
        <Skeleton className="h-7 w-32" />
      </div>
    </div>
  );
}

export function EditProductView({ id }: { id: number }) {
  const valid = Number.isInteger(id) && id > 0;
  const query = useAdminQuery<AdminProduct>(valid ? `${PRODUCTS_PATH}/${id}` : null);
  const product = query.data;

  if (!valid || (query.error && !product)) {
    return (
      <>
        <PageHeader title="Edit product" breadcrumbs={crumbs("Edit")} />
        <LoadError
          title="Couldn't load this product"
          notFoundTitle="Product not found"
          error={valid ? (query.error ?? null) : null}
          onRetry={query.reload}
          action={<ButtonLink href="/admin/products" variant="secondary">Back to products</ButtonLink>}
        />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <PageHeader title="Edit product" breadcrumbs={crumbs("Edit")} />
        <FormSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        breadcrumbs={crumbs(product.code)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={product.isActive ? "success" : "neutral"}>{product.isActive ? "Active" : "Draft"}</Badge>
            <span className="font-mono text-xs">{product.code}</span>
            <span>· Updated {formatDateTime(product.updatedAt)}</span>
          </span>
        }
        actions={
          product.isActive ? (
            <Link
              href={`/product/${product.slug}`}
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
            >
              View in store <ExternalIcon className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          ) : undefined
        }
      />
      <ProductForm key={product.id} product={product} onSaved={(saved) => query.setData(() => saved)} />
    </>
  );
}
