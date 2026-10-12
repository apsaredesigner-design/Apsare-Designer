// Per test file: start from the seeded snapshot. Console mail output is muted
// (tests that need an email read it through `mailSpy`).
import { afterAll, beforeAll, vi } from "vitest";
import { db, resetDb } from "./helpers/db";

beforeAll(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  await resetDb();
});

afterAll(async () => {
  // Fire-and-forget work (audit log, emails) may still be settling; give it a tick.
  await new Promise((r) => setTimeout(r, 50));
  await db.$disconnect();
  // The app's own client (src/server/lib/prisma.ts parks it on globalThis outside production).
  await (globalThis as { __apsarePrisma?: { $disconnect(): Promise<void> } }).__apsarePrisma?.$disconnect();
});
