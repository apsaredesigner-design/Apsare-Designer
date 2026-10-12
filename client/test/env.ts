// Environment for the integration suite. Shared by vitest.config.ts (worker env)
// and the global setup (prisma CLI + seed child processes).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export const CLIENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Optional overrides from client/.env.test (see .env.test.example). Real env vars win.
const envFile = path.join(CLIENT_DIR, ".env.test");
const fileEnv: Record<string, string | undefined> = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const pick = (name: string, fallback: string) => process.env[name] || fileEnv[name] || fallback;

export const TEST_DATABASE_URL = pick("TEST_DATABASE_URL", "postgresql://apsare:apsare@127.0.0.1:5432/apsare_test");
export const TEST_ADMIN_PASSWORD = pick("TEST_ADMIN_PASSWORD", "Admin@Test123");
export const CLIENT_URL = "http://localhost:3000";

/** Refuse to run against anything that is not clearly a throwaway test database. */
export function assertTestDatabase(url: string): string {
  const name = new URL(url).pathname.slice(1);
  if (!/_test$/.test(name)) throw new Error(`Refusing to run the test suite against database "${name}": its name must end with _test.`);
  return name;
}

export const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: TEST_DATABASE_URL,
  CLIENT_URL,
  JWT_SECRET: "test-only-jwt-secret-0123456789abcdef0123456789",
  JWT_EXPIRES_IN: "7d",
  JWT_REMEMBER_EXPIRES_IN: "30d",
  PAYMENT_PROVIDER: "cod",
  MAIL_PROVIDER: "console",
  // Never talk to Cloudinary from tests: uploads go to the dev-local folder.
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  TRUST_PROXY: "0",
  RATE_LIMIT_DISABLED: "0", // NODE_ENV=test already disables every limiter
  SEED_ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
};
