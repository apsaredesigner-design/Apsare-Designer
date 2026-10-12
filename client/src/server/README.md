# `src/server`: backend code (server-only)

Everything the API Route Handlers in `src/app/api/**/route.ts` run on: config,
Prisma, mailer, utils, the `route()` wrapper (`http/`) and, from Phase 1 on, the
ported service modules (`modules/<name>/`).

**Never import anything from here in a Client Component** (a file with
`"use client"`, or anything it imports). These modules read secrets
(`JWT_SECRET`, `DATABASE_URL`, Cloudinary keys) and open database pools. Only
`src/app/api/**/route.ts`, other files in `src/server/`, `prisma/seed.ts` and
`test/` may import them.

- `config/env.ts`: validated env (fails fast on a missing/short `JWT_SECRET`).
- `lib/prisma.ts`: one PrismaClient per process (globalThis, survives HMR).
- `http/route.ts`: `route(options, handler)` and `methods({...})`: see the header
  comment for the pipeline order and the Reuse index in `/MIGRATION.md`.
- Imports inside `src/server` are relative and extensionless (no `.js`), so they
  resolve the same in Next, Vitest and tsx.
