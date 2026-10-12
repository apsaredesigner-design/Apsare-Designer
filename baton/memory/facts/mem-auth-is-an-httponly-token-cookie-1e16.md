---
id: mem-auth-is-an-httponly-token-cookie-1e16
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T12:21:26.761Z'
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
fingerprint: auth-httponly-token-cookie-password-change
---

Auth is an httpOnly 'token' cookie; a password change invalidates older sessions (401 then redirect to login)
