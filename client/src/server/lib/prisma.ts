import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

/** Neon's serverless Postgres (vs. a plain local/docker Postgres, or any other host). */
function isNeon(databaseUrl: string): boolean {
  try {
    return new URL(databaseUrl).hostname.endsWith(".neon.tech");
  } catch {
    return databaseUrl.includes("neon.tech");
  }
}

function createClient() {
  // Neon's adapter speaks its serverless (HTTP/WebSocket) protocol and handles their
  // PgBouncer pooling and prepared-statement quirks correctly; a plain local/docker
  // Postgres uses the standard `pg` driver adapter over TCP.
  const adapter = isNeon(env.databaseUrl)
    ? new PrismaNeon({ connectionString: env.databaseUrl })
    : new PrismaPg({ connectionString: env.databaseUrl });
  // Internal columns never sent to clients (select them explicitly when needed).
  return new PrismaClient({ adapter, omit: { order: { idempotencyKey: true } } });
}

type Client = ReturnType<typeof createClient>;

// One client (one connection pool) per process: `next dev` re-evaluates modules on
// every HMR update, so the instance is parked on globalThis instead of a module variable.
const globalForPrisma = globalThis as unknown as { __apsarePrisma?: Client };

export const prisma: Client = globalForPrisma.__apsarePrisma ?? createClient();
if (!env.isProd) globalForPrisma.__apsarePrisma = prisma;
