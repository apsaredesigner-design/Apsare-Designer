---
id: mem-prisma-migrate-dev-only-needs-all
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:13:17.388Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - docker/mysql/init.sql@dfdbd1f76b05
  - docker-compose.yml@9009a34f2313
supersedes: null
fingerprint: prisma-migrate-dev-only-needs-all
---

prisma migrate dev only needs ALL on `prisma_migrate_shadow_db_%`.* beyond the app database (verified with a negative control); docker/mysql/init.sql grants exactly that, not *.*. init.sql only runs on a fresh mysql volume.
