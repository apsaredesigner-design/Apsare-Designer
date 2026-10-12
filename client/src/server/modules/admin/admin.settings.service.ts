import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import { paginated, toSkipTake } from "../../utils/pagination";
import type { BulkInput, ListQuery, PincodeInput, PincodeUpdate, SettingsInput } from "./admin.settings.schemas";
import { toOrderBy } from "./admin.shared";

// /api/admin/settings logic (extracted from server admin.settings.ts).

const settingsSelect = { deliveryCharge: true, freeShippingThreshold: true, codFee: true, updatedAt: true } as const;

// ─── Store settings (singleton id = 1) ──────────────────────────

export function getSettings() {
  return prisma.storeSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 }, select: settingsSelect });
}

export function updateSettings(data: SettingsInput) {
  return prisma.storeSetting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data }, select: settingsSelect });
}

// ─── Serviceable pincodes ───────────────────────────────────────

export async function listPincodes(q: ListQuery) {
  const where: Prisma.ServiceablePincodeWhereInput = {
    ...(q.q ? { pincode: { startsWith: q.q } } : {}),
    ...(q.codAvailable !== undefined ? { codAvailable: q.codAvailable } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.serviceablePincode.findMany({ where, orderBy: [toOrderBy(q.sort), { pincode: "asc" }], ...toSkipTake(q) }),
    prisma.serviceablePincode.count({ where }),
  ]);
  return paginated(items, total, q.page, q.limit);
}

/** Adds one pincode; 409 if it is already listed. The route answers 201. */
export async function addPincode(data: PincodeInput) {
  // The PK index is named PRIMARY, so the generic P2002 mapping can't name the field; check first.
  if (await prisma.serviceablePincode.findUnique({ where: { pincode: data.pincode }, select: { pincode: true } })) {
    throw new HttpError(409, "Pincode is already serviceable", "CONFLICT", [{ path: "pincode", message: "Already exists" }]);
  }
  return prisma.serviceablePincode.create({ data });
}

/** Adds many; pincodes already listed are skipped (not updated). The route answers 201. */
export async function bulkAddPincodes({ pincodes }: BulkInput) {
  const unique = new Map<string, (typeof pincodes)[number]>();
  for (const p of pincodes) if (!unique.has(p.pincode)) unique.set(p.pincode, p); // first occurrence wins
  const { count } = await prisma.serviceablePincode.createMany({ data: [...unique.values()], skipDuplicates: true });
  return { received: pincodes.length, added: count, skipped: pincodes.length - count };
}

/** PATCH /pincodes/:pincode { deliveryDays?, codAvailable? } → the updated row; 404 if not listed. */
export async function updatePincode(code: string, data: PincodeUpdate) {
  const { count } = await prisma.serviceablePincode.updateMany({ where: { pincode: code }, data });
  if (!count) throw new HttpError(404, "Pincode not found");
  return prisma.serviceablePincode.findUnique({ where: { pincode: code } });
}

/** 404 if not listed. The route answers 204. */
export async function deletePincode(code: string): Promise<void> {
  const { count } = await prisma.serviceablePincode.deleteMany({ where: { pincode: code } });
  if (!count) throw new HttpError(404, "Pincode not found");
}
