---
id: mem-after-the-mysql-container-restarts-the
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:19:52.432Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/lib/prisma.ts@672c44938208
  - docker-compose.yml@9009a34f2313
supersedes: null
fingerprint: after-the-mysql-container-restarts-the
---

After the MySQL container restarts, the mariadb adapter fails with "pool timeout ... active=0" (really: RSA public key not available for caching_sha2_password). Workaround for local runs: append allowPublicKeyRetrieval=true to DATABASE_URL (env override, not committed) or log in once with the mysql CLI to warm the auth cache.
