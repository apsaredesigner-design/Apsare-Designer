---
id: mem-with-prisma-7-plus-prisma-adapter
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:48:29.558Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/error.ts@6753a6d97f09
  - server/src/app.ts@8b41d511c538
  - server/src/lib/prisma.ts@672c44938208
supersedes: null
fingerprint: with-prisma-plus-prisma-adapter-mariadb
---

With Prisma 7 plus @prisma/adapter-mariadb, a P2002 error has no meta.target; the violated index name (e.g. "User_email_key") is at meta.driverAdapterError.cause.constraint.index, and errorHandler maps it to details[{path:"email"}]. Prisma Decimals serialise as strings by default, so app.ts sets a global "json replacer" that sends money as JSON numbers. Don't convert them by hand in handlers.
