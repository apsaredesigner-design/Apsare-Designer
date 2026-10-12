// Runs once per `vitest run`: migrates the test database, re-seeds it from
// scratch and snapshots the seeded tables so each test file can be reset fast.
import { execFileSync } from "node:child_process";
import { CLIENT_DIR, TEST_ENV, assertTestDatabase } from "./env";

export default async function globalSetup() {
  assertTestDatabase(TEST_ENV.DATABASE_URL);
  Object.assign(process.env, TEST_ENV);
  const env = { ...process.env, ...TEST_ENV };
  const run = (args: string[]) => execFileSync("npx", args, { cwd: CLIENT_DIR, env, stdio: ["ignore", "pipe", "inherit"] });

  // Creates the database if the user may do so; see docs/API.md "Testing" if this is denied.
  run(["prisma", "migrate", "deploy"]);

  const { db, takeSnapshot, truncateAll } = await import("./helpers/db");
  try {
    await truncateAll(db);
    run(["tsx", "prisma/seed.ts"]);
    await takeSnapshot(db);
  } finally {
    await db.$disconnect();
  }
}
