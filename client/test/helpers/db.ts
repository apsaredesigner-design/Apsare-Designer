// A Prisma client for the tests themselves (factories, assertions, reset). It is
// deliberately independent of src/server/lib/prisma.ts so importing it does not load
// src/server/config/env.ts (the rate-limit test must set env vars before that happens).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url || !/_test(\?|$)/.test(url)) throw new Error("Tests must run with DATABASE_URL pointing at a *_test database (see vitest.config.ts).");

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

export const SNAPSHOT_PREFIX = "_snap_";

/** App tables (everything but Prisma's bookkeeping and our own snapshot copies). */
export async function appTables(client: PrismaClient = db): Promise<string[]> {
  const rows = await client.$queryRaw<{ name: string }[]>`
    SELECT table_name AS name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations' AND table_name NOT LIKE '\\_snap\\_%'`;
  return rows.map((r) => r.name).sort();
}

/** Copies every app table into `_snap_<table>` (run once after seeding). */
export async function takeSnapshot(client: PrismaClient = db): Promise<void> {
  for (const t of await appTables(client)) {
    await client.$executeRawUnsafe(`DROP TABLE IF EXISTS "${SNAPSHOT_PREFIX}${t}"`);
    await client.$executeRawUnsafe(`CREATE TABLE "${SNAPSHOT_PREFIX}${t}" AS SELECT * FROM "${t}"`);
  }
}

/** Empties every app table (used before seeding). */
export async function truncateAll(client: PrismaClient = db): Promise<void> {
  const tables = await appTables(client);
  if (!tables.length) return;
  const list = tables.map((t) => `"${t}"`).join(", ");
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Restores every app table to the freshly seeded snapshot. Called before each
 * test file (test/setup.ts), so files never see each other's orders, carts,
 * stock changes or extra rows. FK-enforcement triggers are disabled for the
 * duration (Postgres equivalent of MySQL's `SET FOREIGN_KEY_CHECKS = 0`), since
 * our FK constraints aren't DEFERRABLE and a delete/reinsert loop would
 * otherwise have to be topologically ordered. One connection (interactive
 * transaction) so this applies to every statement.
 */
export async function resetDb(): Promise<void> {
  const tables = await appTables();
  await db.$transaction(
    async (tx) => {
      for (const t of tables) await tx.$executeRawUnsafe(`ALTER TABLE "${t}" DISABLE TRIGGER ALL`);
      for (const t of tables) {
        await tx.$executeRawUnsafe(`DELETE FROM "${t}"`);
        await tx.$executeRawUnsafe(`INSERT INTO "${t}" SELECT * FROM "${SNAPSHOT_PREFIX}${t}"`);
      }
      for (const t of tables) await tx.$executeRawUnsafe(`ALTER TABLE "${t}" ENABLE TRIGGER ALL`);
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}
