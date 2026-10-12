"use client";
/**
 * useCategoryTree: GET /admin/categories/tree (inactive included), sorted by
 * sortOrder then name at every level, plus a flattened, display-ordered copy for
 * selects and the tree view.
 *
 *   const { tree, flat, loading, error, reload } = useCategoryTree();
 */
import { useMemo } from "react";
import { CATEGORY_TREE_PATH, flattenTree, sortTree } from "@/lib/admin/helpers/categories";
import type { CategoryTreeNode } from "@/lib/admin/types";
import { useAdminQuery } from "@/lib/admin/use-admin-query";

export function useCategoryTree() {
  const query = useAdminQuery<CategoryTreeNode[]>(CATEGORY_TREE_PATH);
  const tree = useMemo(() => sortTree(query.data ?? []), [query.data]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  return { ...query, tree, flat };
}
