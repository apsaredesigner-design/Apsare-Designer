---
id: mem-server-integration-tests-npm-test-w
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:06:34.720Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - server/vitest.config.ts@59688475b9cd
  - server/test/global-setup.ts@93a25b3dbb9c
  - server/test/helpers/db.ts@6bd2d1bd55b6
  - server/test/rate-limit.test.ts@74dd78b22661
  - .gitignore@ef82a639eb9c
supersedes: null
fingerprint: server-integration-tests-npm-test-server
---

Server integration tests (npm test -w server, Vitest 5 + supertest) run against apsare_test: global-setup migrates, truncates, seeds, then snapshots into _snap_* tables, and test/setup.ts restores from them before each file. The helpers in test/helpers/db.ts use their own PrismaClient, not src/lib/prisma, so importing them does not load src/config/env.ts; this is what lets rate-limit.test.ts set NODE_ENV and RATE_LIMIT_LOGIN in vi.hoisted before the app is imported. The root .gitignore `.env.*` rule also ignores server/.env.test.example.
