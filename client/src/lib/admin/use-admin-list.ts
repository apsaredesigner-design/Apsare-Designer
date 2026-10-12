"use client";
/**
 * useAdminList: a paginated admin list whose state lives in the URL.
 *
 *   const list = useAdminList<AdminProductListItem>("/admin/products", {
 *     filters: ["categoryId", "isActive", "stock"],
 *     defaultSort: "createdAt_desc",
 *   });
 *   list.items / list.meta / list.loading / list.error / list.isEmpty
 *   list.search + list.setSearch(v)   // input value; URL `q` updates after 300ms
 *   list.setPage(2) / list.setLimit(50) / list.setSort("name_asc")
 *   list.filters.stock / list.setFilter("stock", "low") / list.clearFilters()
 *
 * Synced params: page, limit, q, sort and each key in `filters`. Changing anything
 * but `page` resets to page 1. Stale requests are aborted (see useAdminQuery).
 * The component using this hook reads useSearchParams, so render it inside <Suspense>.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toQueryString } from "./api";
import type { Paginated } from "./types";
import { useAdminQuery } from "./use-admin-query";

export const PAGE_SIZES = [10, 20, 50, 100] as const;

export interface UseAdminListOptions {
  /** Extra query keys synced with the URL, e.g. ["status", "isActive"]. */
  filters?: readonly string[];
  defaultLimit?: number;
  /** Sort value used when the URL has none (not written to the URL). */
  defaultSort?: string;
  /** Debounce for `setSearch`, default 300ms. */
  debounceMs?: number;
}

type ParamPatch = Record<string, string | number | null | undefined>;

const toInt = (v: string | null, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function useAdminList<T>(path: string, options: UseAdminListOptions = {}) {
  const { filters: filterKeys = [], defaultLimit = 20, defaultSort = "", debounceMs = 300 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = toInt(searchParams.get("page"), 1);
  const limit = Math.min(toInt(searchParams.get("limit"), defaultLimit), 100);
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? defaultSort;
  const filterKey = filterKeys.join(",");
  const filters = useMemo(
    () => Object.fromEntries(filterKey.split(",").filter(Boolean).map((k) => [k, searchParams.get(k) ?? ""])),
    [filterKey, searchParams],
  ) as Record<string, string>;

  const queryPath = `${path}${toQueryString({ page, limit, q, sort, ...filters })}`;
  const query = useAdminQuery<Paginated<T>>(queryPath);

  // router.replace is async: back-to-back updates must build on the last pending URL,
  // not on `searchParams`, or the first change is lost. Cleared once the URL catches up.
  const pending = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [searchParams]);

  /** Writes params to the URL (null/"" deletes). Resets page unless `page` is in the patch. */
  const update = useCallback(
    (patch: ParamPatch) => {
      const next = new URLSearchParams((pending.current ?? searchParams).toString());
      if (!("page" in patch)) next.delete("page");
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      if (next.get("page") === "1") next.delete("page");
      if (next.get("limit") === String(defaultLimit)) next.delete("limit");
      if (next.get("sort") === defaultSort) next.delete("sort");
      pending.current = next;
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [defaultLimit, defaultSort, pathname, router, searchParams],
  );

  // Search box: show the typed draft until the URL catches up with it.
  const [draft, setDraft] = useState<{ value: string; base: string } | null>(null);
  const search = draft && draft.base === q ? draft.value : q;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const setSearch = useCallback(
    (value: string) => {
      setDraft({ value, base: q });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => update({ q: value.trim() ? value : null }), debounceMs);
    },
    [debounceMs, q, update],
  );

  const items = query.data?.items ?? [];
  const hasActiveFilters = q !== "" || Object.values(filters).some((v) => v !== "");

  return {
    items,
    meta: query.data?.meta,
    loading: query.loading,
    error: query.error,
    /** Settled with zero rows. */
    isEmpty: !query.loading && !query.error && query.data !== undefined && items.length === 0,
    reload: query.reload,
    /** Patch the loaded page locally, e.g. after toggling a row's status. */
    setItems: (fn: (items: T[]) => T[]) => query.setData((d) => (d ? { ...d, items: fn(d.items) } : d)),

    page,
    limit,
    q,
    sort,
    filters,
    search,
    hasActiveFilters,

    setSearch,
    setPage: (p: number) => update({ page: p }),
    setLimit: (l: number) => update({ limit: l }),
    setSort: (s: string | null) => update({ sort: s }),
    setFilter: (key: string, value: string | null) => update({ [key]: value }),
    setFilters: (patch: Record<string, string | null>) => update(patch),
    clearFilters: () => {
      clearTimeout(timer.current);
      setDraft(null);
      update({ q: null, ...Object.fromEntries(filterKeys.map((k) => [k, null])) });
    },
    /** Low-level: patch any URL params. */
    updateParams: update,
  };
}

export type AdminList<T> = ReturnType<typeof useAdminList<T>>;
