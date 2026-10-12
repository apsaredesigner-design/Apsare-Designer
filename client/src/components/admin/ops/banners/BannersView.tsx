"use client";
/**
 * Admin banners: a URL-synced card grid (useAdminList) with search, an active filter,
 * a sort and pagination. Toggle active inline; create/edit in a Modal.
 *
 * Reorder (drag or the up/down buttons, then "Save order") is offered only in display
 * order (sortOrder_asc) with no search or filter, and applies within the current page.
 * PUT /banners/reorder puts the listed ids first, so saving page N also sends the ids
 * of pages 1…N-1 (in their current order) ahead of this page's new order.
 * Render inside <Suspense> (useAdminList reads the URL).
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { FilterBar, FilterSelect } from "@/components/admin/FilterBar";
import { ImageIcon, InfoIcon, PlusIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { Skeleton } from "@/components/admin/Skeleton";
import { card, cx } from "@/components/admin/styles";
import { adminApi } from "@/lib/admin/api";
import { BANNER_FILTERS, BANNER_ORDER_SORT, BANNER_SORTS, BANNERS_PATH } from "@/lib/admin/helpers/banners";
import { moveItem } from "@/lib/admin/helpers/move-item";
import type { Banner } from "@/lib/admin/types";
import { useAdminList } from "@/lib/admin/use-admin-list";
import { useMutation } from "@/lib/admin/use-mutation";
import { LoadError } from "../../shared/LoadError";
import { BannerCard } from "./BannerCard";
import { BannerFormModal } from "./BannerFormModal";

const PAGE_SIZES = [12, 24, 48, 96] as const;

export function BannersView() {
  const list = useAdminList<Banner>(BANNERS_PATH, { filters: BANNER_FILTERS, defaultSort: BANNER_ORDER_SORT, defaultLimit: PAGE_SIZES[0] });
  const canReorder = list.sort === BANNER_ORDER_SORT && !list.hasActiveFilters;
  // An unsaved order belongs to one page of results; it is dropped when the page or query changes.
  const viewKey = `${list.page}|${list.limit}|${list.sort}|${list.q}|${list.filters.isActive}`;
  const [draftState, setDraftState] = useState<{ key: string; items: Banner[] } | null>(null);
  const draft = canReorder && draftState?.key === viewKey ? draftState.items : null;
  const setDraft = (items: Banner[] | null) => setDraftState(items ? { key: viewKey, items } : null);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ banner: Banner | null } | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [announce, setAnnounce] = useState("");
  const banners = draft ?? list.items;
  const offset = (list.page - 1) * list.limit;

  const patchItems = (fn: (items: Banner[]) => Banner[]) => {
    list.setItems(fn);
    setDraftState((d) => (d ? { ...d, items: fn(d.items) } : d));
  };

  const move = (from: number, to: number) => {
    if (!canReorder || to < 0 || to >= banners.length || from === to) return;
    setDraft(moveItem(banners, from, to));
    setAnnounce(`${banners[from].title} moved to position ${offset + to + 1}. Save the order to publish it.`);
  };

  const saveOrder = useMutation(
    async (ids: number[]) => {
      const earlier = await Promise.all(
        Array.from({ length: list.page - 1 }, (_, i) => adminApi.banners.list({ page: i + 1, limit: list.limit, sort: BANNER_ORDER_SORT })),
      );
      return adminApi.banners.reorder([...earlier.flatMap((p) => p.items.map((b) => b.id)), ...ids]);
    },
    {
      success: "Banner order saved",
      onSuccess: () => {
        setDraft(null);
        list.reload();
      },
    },
  );
  const toggle = useMutation((b: Banner, isActive: boolean) => adminApi.banners.update(b.id, { isActive }), {
    success: (b) => (b.isActive ? `“${b.title}” is live` : `“${b.title}” is hidden`),
    onSuccess: (b) => patchItems((items) => items.map((x) => (x.id === b.id ? { ...x, isActive: b.isActive } : x))),
  });
  const del = useMutation((b: Banner) => adminApi.banners.remove(b.id), {
    success: "Banner deleted",
    onSuccess: () => {
      setDeleting(null);
      setDraft(null);
      list.reload();
    },
  });

  const newBanner = () => setEditing({ banner: null });
  const header = (
    <PageHeader
      title="Banners"
      description="The home page hero carousel. In display order, drag cards or use the arrows to reorder, then save."
      actions={
        <>
          {draft && <Button variant="ghost" onClick={() => setDraft(null)} disabled={saveOrder.pending}>Discard order</Button>}
          {draft && <Button variant="gold" onClick={() => void saveOrder.mutate(banners.map((b) => b.id))} loading={saveOrder.pending}>Save order</Button>}
          <Button icon={<PlusIcon />} onClick={newBanner}>New banner</Button>
        </>
      }
    />
  );

  const filters = (
    <FilterBar
      search={<SearchInput label="Search banners" placeholder="Title" value={list.search} onChange={list.setSearch} />}
      active={list.hasActiveFilters}
      onClear={list.clearFilters}
      end={<FilterSelect label="Sort by" value={list.sort} onChange={(v) => list.setSort(v)} options={BANNER_SORTS} />}
    >
      <FilterSelect
        label="Status"
        value={list.filters.isActive}
        onChange={(v) => list.setFilter("isActive", v)}
        options={[{ value: "", label: "Any status" }, { value: "true", label: "Active" }, { value: "false", label: "Hidden" }]}
      />
    </FilterBar>
  );

  const loaded = list.meta !== undefined;
  if (list.error && !loaded) return <>{header}{filters}<LoadError title="Couldn't load banners" error={list.error} onRetry={list.reload} /></>;

  return (
    <>
      {header}
      {filters}
      <p aria-live="polite" className="sr-only">{announce}</p>
      {!canReorder && banners.length > 1 && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-ink/5 px-3 py-2 text-sm text-ink/70">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>To reorder, sort by display order and clear the search and filters.</span>
        </p>
      )}
      {!loaded ? (
        <div role="status" aria-label="Loading banners" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className={card}>
          {list.hasActiveFilters ? (
            <EmptyState compact title="No banners match" description="Try a different search or clear the filters." action={<Button variant="secondary" onClick={list.clearFilters}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={<ImageIcon />} title="No banners yet" description="Add one to feature a collection on the home page." action={<Button onClick={newBanner}>Add a banner</Button>} />
          )}
        </div>
      ) : (
        <ol
          aria-label={canReorder ? "Banners in display order" : "Banners"}
          aria-busy={list.loading}
          className={cx("grid gap-5 sm:grid-cols-2 xl:grid-cols-3", draft && "rounded-xl outline-2 outline-offset-4 outline-gold-500/50 outline-dashed")}
        >
          {banners.map((b, i) => (
            <BannerCard
              key={b.id}
              banner={b}
              index={i}
              count={banners.length}
              position={canReorder ? offset + i + 1 : undefined}
              reorderable={canReorder}
              dragging={dragFrom === i}
              onMove={(to) => move(i, to)}
              onToggle={(v) => void toggle.mutate(b, v)}
              onEdit={() => setEditing({ banner: b })}
              onDelete={() => setDeleting(b)}
              dragProps={{
                draggable: canReorder,
                onDragStart: (e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; },
                onDragOver: (e) => { if (dragFrom !== null) e.preventDefault(); },
                onDrop: (e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); },
                onDragEnd: () => setDragFrom(null),
              }}
            />
          ))}
        </ol>
      )}
      {list.meta && list.meta.total > 0 && (
        <div className={cx(card, "mt-5")}>
          <Pagination meta={list.meta} onPageChange={list.setPage} onLimitChange={list.setLimit} pageSizes={PAGE_SIZES} />
        </div>
      )}
      {editing && (
        <BannerFormModal
          key={editing.banner?.id ?? "new"}
          banner={editing.banner}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setDraft(null); list.reload(); }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        tone="danger"
        title={`Delete “${deleting?.title ?? ""}”?`}
        description="It is removed from the home page immediately. This can't be undone."
        confirmLabel="Delete"
        loading={del.pending}
        onConfirm={() => deleting && void del.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
