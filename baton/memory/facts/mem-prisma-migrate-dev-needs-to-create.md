---
id: mem-prisma-migrate-dev-needs-to-create
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:48:29.611Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - docker-compose.yml@9009a34f2313
  - docker/mysql/init.sql@dfdbd1f76b05
  - server/prisma/schema.prisma@2a133ec70a78
supersedes: null
fingerprint: prisma-migrate-dev-needs-create-shadow
---

prisma migrate dev needs to create a shadow DB, so the dev MySQL user 'apsare' is granted ALL on *.* by docker/mysql/init.sql. That script only runs on a fresh volume; on an old volume, run the GRANT as root yourself. Product search must use raw SQL MATCH(name, brand, code, description) AGAINST (...), because the column list has to match the FULLTEXT index exactly.
