---
id: mem-error-shape-error-message-code-details
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T12:33:38.922Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - server/src/middleware/csrf.ts@6ee06c12d7d2
  - server/src/modules/admin/admin.shared.ts@6c464622da7c
  - .gitignore@ef82a639eb9c
  - docker-compose.yml@9009a34f2313
  - docker/mysql/init.sql@dfdbd1f76b05
  - docs/API.md@9450d7ada129
  - server/prisma/schema.prisma@2a133ec70a78
  - server/prisma/seed.ts@ce9ecb03f3ab
supersedes: mem-error-shape-error-message-code-details-bf18
fingerprint: error-shape-error-message-code-details
---

Error shape { error: { message, code, details } }; list shape { items, meta: { page, limit, total, totalPages, hasNext } }, limit max 100; prices are numbers in rupees and computed on the server
