import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { CreateInput, ListQuery, UpdateInput } from "./admin.categories.schemas";
import { slugify, toOrderBy, uniqueSlug } from "./admin.shared";

// /api/admin/categories logic (extracted from server admin.categories.ts).

const select = {
  id: true,
  name: true,
  slug: true,
  description: true,
  parentId: true,
  imageUrl: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategorySelect;

function categorySlug(text: string, excludeId?: number) {
  return uniqueSlug(slugify(text), async (prefix) =>
    (
      await prisma.category.findMany({
        where: { slug: { startsWith: prefix }, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { slug: true },
      })
    ).map((c) => c.slug),
  );
}

async function assertParentExists(parentId: number) {
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) throw new HttpError(400, "Parent category not found", "VALIDATION_ERROR", [{ path: "body.parentId", message: "Not found" }]);
}

/** 409 if making `parentId` the parent of `id` would create a loop (walks up from the new parent). */
async function assertNoCycle(id: number, parentId: number) {
  const seen = new Set<number>();
  let current: number | null = parentId;
  while (current !== null) {
    if (current === id) throw new HttpError(409, "A category cannot be moved under itself or one of its descendants", "CATEGORY_CYCLE");
    if (seen.has(current)) break; // pre-existing loop; don't spin forever
    seen.add(current);
    const row: { parentId: number | null } | null = await prisma.category.findUnique({ where: { id: current }, select: { parentId: true } });
    current = row?.parentId ?? null;
  }
}

/** `/category/<old>` (optionally followed by `/…`, `?…` or `#…`) in banner ctaHref → `/category/<new>…`. */
async function rewriteBannerLinks(tx: Prisma.TransactionClient, oldSlug: string, newSlug: string) {
  const prefix = `/category/${oldSlug}`;
  const banners = await tx.banner.findMany({ where: { ctaHref: { startsWith: prefix } }, select: { id: true, ctaHref: true } });
  for (const b of banners) {
    const rest = b.ctaHref!.slice(prefix.length);
    if (rest === "" || /^[/?#]/.test(rest)) {
      await tx.banner.update({ where: { id: b.id }, data: { ctaHref: `/category/${newSlug}${rest}` } });
    }
  }
}

export async function listCategories(q: ListQuery) {
  const where: Prisma.CategoryWhereInput = {
    ...(q.q ? { OR: [{ name: { contains: q.q, mode: "insensitive" } }, { slug: { contains: q.q, mode: "insensitive" } }] } : {}),
    ...(q.parentId !== undefined ? { parentId: q.parentId } : {}),
    ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy: [toOrderBy(q.sort), { id: "asc" }], ...toSkipTake(q), select }),
    prisma.category.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

export type TreeNode = Prisma.CategoryGetPayload<{ select: typeof select }> & { children: TreeNode[] };

/**
 * GET /categories/tree: every category (inactive ones included) as a nested tree,
 * roots first, children sorted by sortOrder then name. Not paginated: it is the
 * whole (small) category table, for tree views and parent pickers.
 */
export async function getCategoryTree(): Promise<TreeNode[]> {
  const rows = await prisma.category.findMany({ select, orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }] });
  const nodes = new Map<number, TreeNode>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export async function getCategory(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { ...select, children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true, isActive: true } } },
  });
  if (!category) throw new HttpError(404, "Category not found");
  return category;
}

/** The route answers 201. */
export async function createCategory(body: CreateInput) {
  if (body.parentId) await assertParentExists(body.parentId);
  const slug = body.slug ?? (await categorySlug(body.name));
  return prisma.category.create({ data: { ...body, slug }, select });
}

export async function updateCategory(id: number, body: UpdateInput) {
  const current = await prisma.category.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!current) throw new HttpError(404, "Category not found");
  if (body.parentId) {
    await assertParentExists(body.parentId);
    await assertNoCycle(id, body.parentId);
  }
  // A slug only changes when sent explicitly (renaming keeps it, so links stay stable).
  // When it does change, banner links to the old category page follow it.
  return prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({ where: { id }, data: body, select });
    if (body.slug && body.slug !== current.slug) await rewriteBannerLinks(tx, current.slug, body.slug);
    return updated;
  });
}

/** 409 CATEGORY_IN_USE while it has products or subcategories. The route answers 204. */
export async function deleteCategory(id: number): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id }, select: { _count: { select: { products: true, children: true } } } });
  if (!category) throw new HttpError(404, "Category not found");
  const { products, children } = category._count;
  if (products || children) {
    throw new HttpError(409, `Category still has ${products} product(s) and ${children} subcategory(ies)`, "CATEGORY_IN_USE");
  }
  await prisma.category.delete({ where: { id } });
}
