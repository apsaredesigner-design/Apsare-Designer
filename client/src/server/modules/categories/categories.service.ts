import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  parentId: true,
  imageUrl: true,
  sortOrder: true,
  isActive: true,
} as const;

export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Active products in this category and all its descendants. */
  productCount: number;
  children: CategoryNode[];
}

export interface CategoryIndex {
  roots: CategoryNode[];
  byId: Map<number, CategoryNode>;
  bySlug: Map<string, CategoryNode>;
}

/**
 * Active categories that are reachable from an active root (a category under an
 * inactive parent is hidden too), as a tree. Two queries; the table is small.
 * Pass `withCounts: false` to skip the product-count groupBy.
 */
export async function loadCategoryIndex({ withCounts = true } = {}): Promise<CategoryIndex> {
  const [rows, counts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: categorySelect, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    withCounts
      ? prisma.product.groupBy({ by: ["categoryId"], where: { isActive: true }, _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  const own = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const all = new Map<number, CategoryNode>(rows.map((r) => [r.id, { ...r, productCount: own.get(r.id) ?? 0, children: [] }]));

  const roots: CategoryNode[] = [];
  for (const node of all.values()) {
    if (node.parentId === null) roots.push(node);
    else all.get(node.parentId)?.children.push(node); // orphan (inactive parent) is dropped
  }

  // Keep only nodes reachable from active roots, rolling counts up to parents.
  const byId = new Map<number, CategoryNode>();
  const bySlug = new Map<string, CategoryNode>();
  const visit = (node: CategoryNode): number => {
    byId.set(node.id, node);
    bySlug.set(node.slug, node);
    for (const child of node.children) node.productCount += visit(child);
    return node.productCount;
  };
  roots.forEach(visit);
  return { roots, byId, bySlug };
}

/** The node's id plus every descendant id. */
export function subtreeIds(node: CategoryNode): number[] {
  return [node.id, ...node.children.flatMap(subtreeIds)];
}

/** Root-first chain of `{ id, name, slug }` ending at the node itself. */
export function breadcrumbOf(index: CategoryIndex, id: number) {
  const trail: { id: number; name: string; slug: string }[] = [];
  for (let node = index.byId.get(id); node; node = node.parentId === null ? undefined : index.byId.get(node.parentId)) {
    trail.unshift({ id: node.id, name: node.name, slug: node.slug });
  }
  return trail;
}

export async function getCategoryTree() {
  return (await loadCategoryIndex()).roots;
}

export async function getCategoryBySlug(slug: string) {
  const index = await loadCategoryIndex();
  const node = index.bySlug.get(slug);
  if (!node) throw new HttpError(404, "Category not found");
  const { children, ...category } = node;
  return { category, breadcrumb: breadcrumbOf(index, node.id), children };
}
