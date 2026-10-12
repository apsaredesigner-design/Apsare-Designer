import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { ListQuery, UpdateInput } from "./admin.contact.schemas";

// Contact-form inbox (extracted from server admin.contact.ts; messages come from POST /api/contact).

export async function listContactMessages(q: ListQuery) {
  const where: Prisma.ContactMessageWhereInput = q.isRead !== undefined ? { isRead: q.isRead } : {};
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...toSkipTake(q) }),
    prisma.contactMessage.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

/** Unknown id -> P2025 -> 404. */
export function updateContactMessage(id: number, body: UpdateInput) {
  return prisma.contactMessage.update({ where: { id }, data: body });
}

/** Unknown id -> P2025 -> 404. The route answers 204. */
export async function deleteContactMessage(id: number): Promise<void> {
  await prisma.contactMessage.delete({ where: { id } });
}
