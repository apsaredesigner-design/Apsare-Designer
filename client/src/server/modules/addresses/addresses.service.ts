import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../utils/http-error";
import type { CreateAddressInput, UpdateAddressInput } from "./addresses.schemas";

type Tx = Prisma.TransactionClient;

const addressSelect = {
  id: true,
  fullName: true,
  mobile: true,
  line1: true,
  line2: true,
  landmark: true,
  city: true,
  state: true,
  pincode: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Serialises address writes per user (row lock on User), so concurrent requests
 * can't both see "no addresses yet" or leave two defaults.
 */
async function lockUser(tx: Tx, userId: number) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

/** Scoped lookup: another user's id is indistinguishable from a missing one (404). */
async function findOwned(tx: Tx, userId: number, id: number) {
  const address = await tx.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } });
  if (!address) throw new HttpError(404, "Address not found");
  return address;
}

const clearDefault = (tx: Tx, userId: number) =>
  tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });

export function listAddresses(userId: number) {
  return prisma.address.findMany({
    where: { userId },
    select: addressSelect,
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export function createAddress(userId: number, { isDefault, ...data }: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const makeDefault = isDefault === true || (await tx.address.count({ where: { userId } })) === 0;
    if (makeDefault) await clearDefault(tx, userId);
    return tx.address.create({ data: { ...data, userId, isDefault: makeDefault }, select: addressSelect });
  });
}

/** `isDefault: true` moves the default here; `isDefault: false` is ignored (pick another address instead). */
export function updateAddress(userId: number, id: number, { isDefault, ...data }: UpdateAddressInput) {
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const current = await findOwned(tx, userId, id);
    const makeDefault = isDefault === true && !current.isDefault;
    if (makeDefault) await clearDefault(tx, userId);
    return tx.address.update({
      where: { id },
      data: { ...data, ...(makeDefault && { isDefault: true }) },
      select: addressSelect,
    });
  });
}

/** Deleting the default promotes the most recently created remaining address. */
export function deleteAddress(userId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const current = await findOwned(tx, userId, id);
    await tx.address.delete({ where: { id } });
    if (!current.isDefault) return;
    const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true } });
    if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
  });
}

export function setDefaultAddress(userId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    await findOwned(tx, userId, id);
    await clearDefault(tx, userId);
    return tx.address.update({ where: { id }, data: { isDefault: true }, select: addressSelect });
  });
}
