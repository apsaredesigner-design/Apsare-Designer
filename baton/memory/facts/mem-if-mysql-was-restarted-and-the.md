---
id: mem-if-mysql-was-restarted-and-the
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T12:21:26.841Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/csrf.ts@6ee06c12d7d2
  - server/src/modules/admin/admin.routes.ts@059b6ba11ceb
  - server/src/modules/admin/admin.shared.ts@cf83a9586de6
  - .gitignore@eda5af5e6276
  - docker-compose.yml@9009a34f2313
  - docker/mysql/init.sql@dfdbd1f76b05
  - docs/API.md@27f5b6b35816
  - server/prisma/schema.prisma@e1f5580b8048
supersedes: null
fingerprint: mysql-was-restarted-and-the-api
---

If MySQL was restarted and the API can't connect, DATABASE_URL needs ?allowPublicKeyRetrieval=true (already in .env.example)
