/**
 * Category tree helpers (pure). Contract: docs/API.md → Admin → Categories.
 *
 *   sortTree(await adminApi.categories.tree())  → roots and children by sortOrder, then name
 *   flattenTree(tree)        → [{ node, depth }] in display order
 *   descendantIds(node)      → Set of ids under `node` (for parent pickers)
 *   moveSibling(siblings, i, -1) → [{ id, sortOrder }] PATCHes that move siblings[i] up one
 *   slugify("Silk Sarees")   → "silk-sarees"
 */
import type { CategoryTreeNode } from "../types";
import { moveItem } from "./move-item";

export const CATEGORY_TREE_PATH = "/admin/categories/tree";
/** Server limit for `sortOrder` (0–10000). */
export const CATEGORY_SORT_MAX = 10_000;

export interface FlatCategory {
  node: CategoryTreeNode;
  depth: number;
}

const byOrder = (a: CategoryTreeNode, b: CategoryTreeNode) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.id - b.id;

/** A copy of the tree with every level sorted by sortOrder, then name (the server's order). */
export function sortTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes.map((n) => ({ ...n, children: sortTree(n.children) })).sort(byOrder);
}

/**
 * Moves `siblings[index]` by `delta` (-1 up, +1 down) and returns the PATCHes that
 * renumber the siblings 0…n-1 in the new order (only the ones that change). Renumbering
 * also fixes ties such as every sibling at sortOrder 0.
 */
export function moveSibling(siblings: CategoryTreeNode[], index: number, delta: -1 | 1): { id: number; sortOrder: number }[] {
  const to = index + delta;
  if (to < 0 || to >= siblings.length) return [];
  return moveItem(siblings, index, to)
    .map((n, sortOrder) => ({ id: n.id, sortOrder, changed: n.sortOrder !== sortOrder }))
    .filter((p) => p.changed)
    .map(({ id, sortOrder }) => ({ id, sortOrder }));
}

/** Depth-first, in display order (call on a sorted tree). */
export function flattenTree(nodes: CategoryTreeNode[], depth = 0, out: FlatCategory[] = []): FlatCategory[] {
  for (const node of nodes) {
    out.push({ node, depth });
    flattenTree(node.children, depth + 1, out);
  }
  return out;
}

export function descendantIds(node: CategoryTreeNode, out = new Set<number>()): Set<number> {
  for (const child of node.children) {
    out.add(child.id);
    descendantIds(child, out);
  }
  return out;
}

export function findNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return undefined;
}

/** Mirrors the server's slug rule: lowercase letters, digits and single hyphens. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Select options with the depth shown as an indent ("— Silk"). Prioritizes "All-in-One" at the top. */
export function categoryOptions(flat: FlatCategory[], exclude?: Set<number>) {
  const options = flat
    .filter(({ node }) => !exclude?.has(node.id))
    .map(({ node, depth }) => ({
      value: node.id,
      label: `${"— ".repeat(depth)}${node.name}${node.isActive ? "" : " (inactive)"}`,
      isAllInOne: node.slug === "all-in-one" || node.name.toLowerCase() === "all-in-one",
    }));

  options.sort((a, b) => {
    if (a.isAllInOne && !b.isAllInOne) return -1;
    if (!a.isAllInOne && b.isAllInOne) return 1;
    return 0;
  });

  return options.map(({ value, label }) => ({ value, label }));
}
