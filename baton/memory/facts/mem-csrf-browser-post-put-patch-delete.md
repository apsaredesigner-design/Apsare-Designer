---
id: mem-csrf-browser-post-put-patch-delete
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T12:21:26.697Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - server/src/middleware/csrf.ts@6ee06c12d7d2
  - server/src/modules/admin/admin.routes.ts@3e9c6b679be9
  - server/src/modules/admin/admin.shared.ts@6c464622da7c
  - .gitignore@ef82a639eb9c
  - docker-compose.yml@9009a34f2313
  - docker/mysql/init.sql@dfdbd1f76b05
  - docs/API.md@9450d7ada129
  - server/prisma/schema.prisma@2a133ec70a78
supersedes: null
fingerprint: csrf-browser-post-put-patch-delete
---

CSRF: browser POST/PUT/PATCH/DELETE must come from CLIENT_URL (http://localhost:3000) with Content-Type application/json (multipart only for /api/uploads). api() already does this; for uploads pass FormData and DON'T set Content-Type manually (api() sets JSON by default, so use a separate fetch or o
