// Prisma CLI config (generate, migrate, seed). Env is loaded the same way Next.js
// loads it (.env, .env.local, .env.$NODE_ENV[.local]; real env vars win) via @next/env,
// which ships with Next.js; no dotenv.
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
