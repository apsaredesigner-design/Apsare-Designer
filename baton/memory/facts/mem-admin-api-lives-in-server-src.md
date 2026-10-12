---
id: mem-admin-api-lives-in-server-src
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:02:23.787Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/admin/admin.routes.ts@0d2676768daa
  - server/src/modules/admin/admin.shared.ts@9e25cb24a995
  - server/src/modules/admin/admin.products.ts@6cf3d43c3384
  - server/src/modules/admin/admin.orders.ts@bb722069932a
  - server/src/modules/orders/orders.service.ts@8745cd938a14
supersedes: null
fingerprint: admin-api-lives-server-src-modules
---

Admin API lives in server/src/modules/admin/admin.<area>.ts, mounted by admin.routes.ts. List sorts use a z.enum of "field_dir" values plus the typed toOrderBy() from admin.shared.ts. Product delete (single and bulk) soft-deletes (isActive=false) products referenced by order items and hard-deletes the rest. Admin order cancel copies orders.service cancelOrder side effects locally, so keep them in sync (or extract a shared cancelOrderTx).
