---
id: mem-next-api-route-ts-files-under
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T14:40:38.619Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - client/src/server/http/route.ts@4c6e1707fbb0
  - client/src/server/http/guards.ts@524b9c043488
  - client/src/server/modules/admin/admin.route.ts@d9ff3e8dfb2e
  - client/test/admin-access.test.ts@4807f926f4f1
supersedes: null
fingerprint: next-api-route-files-under-express
---

Next API route.ts files under an Express router that had router.use(...) must export via guardedMethods(<guard from http/guards.ts>, {...}) (admin: adminMethods from admin.route.ts), and a static folder beside a [param] sibling via staticTwin(sibling, params, {...}); each guarded prefix also has a [...slug]/[[...slug]] catch-all so unknown sub-paths answer 401/403 before 404 like Express. test/admin-access.test.ts fails if an admin/uploads route file or method lacks a table row.
