import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { CreateInput, ListQuery, ReorderInput, UpdateInput } from "./admin.banners.schemas";
import { toOrderBy } from "./admin.shared";

// /api/admin/banners logic (extracted from server admin.banners.ts).

export async function listBanners(q: ListQuery) {
  const where: Prisma.BannerWhereInput = {
    ...(q.q ? { title: { contains: q.q, mode: "insensitive" } } : {}),
    ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.banner.findMany({ where, orderBy: [toOrderBy(q.sort), { id: "asc" }], ...toSkipTake(q) }),
    prisma.banner.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

/**
 * Sets sortOrder = position in `ids` (0-based). Every id must exist. Banners not
 * listed keep their relative order and are placed after the listed ones.
 */
export async function reorderBanners(body: ReorderInput) {
  const ids = [...new Set(body.ids)];
  const all = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const known = new Set(all.map((b) => b.id));
  if (ids.some((id) => !known.has(id))) {
    throw new HttpError(400, "Some banners were not found", "VALIDATION_ERROR", [{ path: "body.ids", message: "Unknown id" }]);
  }
  const listed = new Set(ids);
  const order = [...ids, ...all.map((b) => b.id).filter((id) => !listed.has(id))];
  await prisma.$transaction(order.map((id, sortOrder) => prisma.banner.update({ where: { id }, data: { sortOrder } })));
  return { items: await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }) };
}

export async function getBanner(id: number) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new HttpError(404, "Banner not found");
  return banner;
}

/** The route answers 201. */
export async function createBanner(body: CreateInput) {
  // New banners go to the end unless a position is given.
  const sortOrder = body.sortOrder ?? ((await prisma.banner.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;
  return prisma.banner.create({ data: { ...body, sortOrder } });
}

/** Unknown id → P2025 → 404. */
export function updateBanner(id: number, body: UpdateInput) {
  return prisma.banner.update({ where: { id }, data: body });
}

/** Unknown id → P2025 → 404. The route answers 204. */
export async function deleteBanner(id: number): Promise<void> {
  await prisma.banner.delete({ where: { id } });
}
