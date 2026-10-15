"use client";
/**
 * /admin/categories: the full category tree (inactive included, in sortOrder order)
 * with create, edit, delete and move up/down within a parent. A move renumbers the
 * siblings' sortOrder (PATCH per changed sibling) and reloads the tree. Delete shows
 * the server's 409 reason (has products or subcategories).
 */
import { useState } from "react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/admin/EmptyState";
import { FolderIcon, PlusIcon, WarningIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/admin/Skeleton";
import { card, cx } from "@/components/admin/styles";
import { adminApi } from "@/lib/admin/api";
import { errorMessage } from "@/lib/admin/errors";
import { moveSibling } from "@/lib/admin/helpers/categories";
import type { CategoryTreeNode } from "@/lib/admin/types";
import { useMutation } from "@/lib/admin/use-mutation";
import { useToast } from "@/components/admin/Toast";
import { LoadError } from "../../shared/LoadError";
import { useCategoryTree } from "../../shared/useCategoryTree";
import { CategoryFormModal, type CategoryTarget } from "./CategoryFormModal";
import { CategoryTree } from "./CategoryTree";

export function CategoriesView() {
  const { tree, flat, loading, error, reload, data } = useCategoryTree();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<{ target: CategoryTarget; key: number } | null>(null);
  const [toDelete, setToDelete] = useState<CategoryTreeNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Everything starts expanded; we track the collapsed ids.
  const expanded = new Set(flat.map((f) => f.node.id).filter((id) => !collapsed.has(id)));
  const toggle = (id: number) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const open = (target: CategoryTarget) => setForm({ target, key: Date.now() });

  const [announce, setAnnounce] = useState("");
  const move = useMutation(
    async (siblings: CategoryTreeNode[], index: number, delta: -1 | 1) => {
      const patches = moveSibling(siblings, index, delta);
      await Promise.all(patches.map((p) => adminApi.categories.update(p.id, { sortOrder: p.sortOrder })));
      return siblings[index];
    },
    {
      onSuccess: (node, siblings, index, delta) =>
        setAnnounce(`${node.name} moved to position ${index + delta + 1} of ${siblings.length}.`),
      // A partial failure can leave a mix of old and new positions: always show the server's state.
      onSettled: reload,
    },
  );

  const toast = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const toggleActive = useMutation(
    async ({ node, isActive }: { node: CategoryTreeNode; isActive: boolean }) => {
      setTogglingId(node.id);
      await adminApi.categories.setStatus(node.id, isActive);
      return { node, isActive };
    },
    {
      onSuccess: ({ node, isActive }) => {
        toast.success(`“${node.name}” is now ${isActive ? "visible" : "hidden"} on the store.`);
      },
      onError: (err) => {
        toast.error(errorMessage(err));
      },
      onSettled: () => {
        setTogglingId(null);
        void reload();
      },
    },
  );

  const del = useMutation((id: number) => adminApi.categories.remove(id), {
    error: false,
    success: () => `Category “${toDelete?.name}” deleted`,
    onSuccess: () => {
      setToDelete(null);
      reload();
    },
    onError: (err) =>
      setDeleteError(err.status === 409 ? `${err.message}. Move or delete them first, or deactivate the category instead.` : errorMessage(err)),
  });

  const newButton = (
    <Button icon={<PlusIcon />} onClick={() => open({ kind: "create", parentId: null })}>
      New category
    </Button>
  );

  let body: React.ReactNode;
  if (!data) {
    body = (
      <div className="space-y-3 p-4" aria-busy aria-label="Loading categories">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={cx("h-10", i % 2 ? "ml-8 w-2/3" : "w-full")} />
        ))}
      </div>
    );
  } else if (tree.length === 0) {
    body = <EmptyState icon={<FolderIcon />} title="No categories yet" description="Create a category to start organising products." action={newButton} />;
  } else {
    body = (
      <CategoryTree
        nodes={tree}
        actions={{
          expanded,
          onToggle: toggle,
          onEdit: (node) => open({ kind: "edit", node }),
          onAddChild: (node) => open({ kind: "create", parentId: node.id }),
          onDelete: (node) => {
            setDeleteError(null);
            setToDelete(node);
          },
          onMove: (siblings, index, delta) => void move.mutate(siblings, index, delta),
          moving: move.pending || loading,
          onToggleActive: (node, isActive) => void toggleActive.mutate({ node, isActive }),
          togglingId,
        }}
      />
    );
  }

  return (
    <>
      <PageHeader title="Categories" description="Organise the catalogue. Inactive categories stay here but are hidden from the store." actions={newButton} />
      {tree.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set())}>Expand all</Button>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set(flat.filter((f) => f.node.children.length).map((f) => f.node.id)))}>
            Collapse all
          </Button>
          {loading && <span className="self-center text-xs text-ink/50" role="status">Refreshing…</span>}
        </div>
      )}
      <p aria-live="polite" className="sr-only">{announce}</p>
      {error && !data ? (
        <LoadError title="Couldn't load categories" error={error} onRetry={reload} />
      ) : (
        <div className={cx(card, "overflow-hidden")}>{body}</div>
      )}

      {form && (
        <CategoryFormModal
          key={form.key}
          open
          target={form.target}
          flat={flat}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="This can't be undone. Categories with products or subcategories can't be deleted."
        confirmLabel="Delete"
        tone="danger"
        loading={del.pending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      >
        {deleteError && (
          <p role="alert" className="flex gap-2 rounded-md bg-sale/5 px-3 py-2 text-sm text-sale">
            <WarningIcon className="mt-0.5 size-4 shrink-0" />
            <span>{deleteError}</span>
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
