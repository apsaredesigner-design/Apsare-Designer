---
id: mem-ownership-antigravity-owns-client-src-app
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T12:33:38.857Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/csrf.ts@6ee06c12d7d2
  - server/src/modules/admin/admin.shared.ts@cf83a9586de6
  - .gitignore@eda5af5e6276
  - docker-compose.yml@9009a34f2313
  - docker/mysql/init.sql@dfdbd1f76b05
  - docs/API.md@27f5b6b35816
  - server/prisma/schema.prisma@e1f5580b8048
  - server/prisma/seed.ts@da7b5fb66afd
supersedes: null
fingerprint: ownership-antigravity-owns-client-src-app
---

Ownership: Antigravity owns client/src/app/(store)/**, client/src/app/layout.tsx, globals.css, not-found.tsx, client/src/components/{ui,layout,product,store}/**, client/src/hooks/**, client/src/lib/motion.ts, next.config.ts. CLAUDE owns client/src/app/admin/**, client/src/components/admin/**, client
