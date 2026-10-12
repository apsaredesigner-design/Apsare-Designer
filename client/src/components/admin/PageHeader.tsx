/**
 * PageHeader: the title block at the top of every admin page.
 *
 *   <PageHeader
 *     title="Products"
 *     description="Manage your catalogue, stock and visibility."
 *     breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "Edit" }]}
 *     actions={<ButtonLink href="/admin/products/new" icon={<PlusIcon />}>New product</ButtonLink>}
 *   />
 *
 * Renders the page's single <h1> in Cormorant Garamond with a gold rule.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "./icons";
import { cx, focusRing } from "./styles";

export interface Crumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cx("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-xs tracking-wide text-ink/55">
              {breadcrumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRightIcon className="size-3" />}
                  {c.href && i < breadcrumbs.length - 1 ? (
                    <Link href={c.href} className={cx("rounded hover:text-ink", focusRing)}>
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-4xl leading-tight font-semibold tracking-wide text-ink">{title}</h1>
        <div aria-hidden className="mt-2 h-px w-12 bg-gold-500" />
        {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/60">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
