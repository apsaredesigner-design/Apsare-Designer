"use client";
/**
 * Products list filters: search, category (from the full tree), status, stock,
 * one merchandising flag and a sort select covering every whitelisted sort.
 */
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { SearchInput } from "@/components/admin/SearchInput";
import type { AdminList } from "@/lib/admin/use-admin-list";
import { categoryOptions, type FlatCategory } from "@/lib/admin/helpers/categories";
import { PRODUCT_FLAGS, PRODUCT_FLAG_LABEL } from "@/lib/admin/helpers/products";
import type { AdminProductListItem } from "@/lib/admin/types";

export const PRODUCT_SORTS = [
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "updatedAt_desc", label: "Recently updated" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "salePrice_asc", label: "Price: low to high" },
  { value: "salePrice_desc", label: "Price: high to low" },
  { value: "discountPercent_desc", label: "Biggest discount" },
  { value: "soldCount_desc", label: "Best selling" },
];

export function ProductFilters({ list, categories }: { list: AdminList<AdminProductListItem>; categories: FlatCategory[] }) {
  const flag = PRODUCT_FLAGS.find((f) => list.filters[f] === "true") ?? "";
  const setFlag = (value: string | null) =>
    list.setFilters(Object.fromEntries(PRODUCT_FLAGS.map((f) => [f, f === value ? "true" : null])));

  return (
    <FilterBar
      search={<SearchInput label="Search products" placeholder="Name or code" value={list.search} onChange={list.setSearch} />}
      active={list.hasActiveFilters}
      onClear={list.clearFilters}
      end={<FilterSelect label="Sort by" value={list.sort} onChange={(v) => list.setSort(v)} options={PRODUCT_SORTS} />}
    >
      <FilterSelect
        label="Category"
        value={list.filters.categoryId}
        onChange={(v) => list.setFilter("categoryId", v)}
        options={[{ value: "", label: "All categories" }, ...categoryOptions(categories)]}
      />
      <FilterSelect
        label="Status"
        value={list.filters.isActive}
        onChange={(v) => list.setFilter("isActive", v)}
        options={[
          { value: "", label: "Any status" },
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive / draft" },
        ]}
      />
      <FilterSelect
        label="Stock"
        value={list.filters.stock}
        onChange={(v) => list.setFilter("stock", v)}
        options={[
          { value: "", label: "Any stock" },
          { value: "in", label: "In stock" },
          { value: "low", label: "Low stock" },
          { value: "out", label: "Out of stock" },
        ]}
      />
      <FilterSelect
        label="Flag"
        value={flag}
        onChange={setFlag}
        options={[{ value: "", label: "Any flag" }, ...PRODUCT_FLAGS.map((f) => ({ value: f, label: PRODUCT_FLAG_LABEL[f] }))]}
      />
    </FilterBar>
  );
}
