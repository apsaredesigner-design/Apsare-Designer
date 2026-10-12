import path from "node:path";
import { defineConfig } from "vitest/config";
import { TEST_ENV, assertTestDatabase } from "./test/env";

assertTestDatabase(TEST_ENV.DATABASE_URL);

// Integration suite: the real Route Handlers (src/app/api/**/route.ts), called
// in-process by test/helpers/http.ts, against a real Postgres test database
// (`apsare_test` by default). Files run one at a time because they share the
// database; each file starts from the seeded snapshot (test/setup.ts).
// It owns apsare_test: never point two runs at it at the same time.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    setupFiles: ["test/setup.ts"],
    env: TEST_ENV,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
