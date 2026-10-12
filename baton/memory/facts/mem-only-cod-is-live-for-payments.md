---
id: mem-only-cod-is-live-for-payments
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T11:50:45.815Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - docs/API.md@748baa5baf59
  - server/src/modules/orders/orders.status.ts@029415c5c9cb
  - server/src/modules/addresses/addresses.routes.ts@e2d8f36a4b37
  - server/src/modules/auth/auth.routes.ts@817d224d5fa9
  - server/src/modules/categories/categories.routes.ts@6f2c386014bd
  - server/src/modules/orders/orders.routes.ts@089a325b9f79
  - server/src/modules/orders/orders.service.ts@
  - server/src/modules/payments/payments.routes.ts@1f19aed68df7
supersedes: null
fingerprint: only-cod-live-for-payments-show
---

Only COD is live for payments; show UPI/Card/Net Banking as disabled 'coming soon' options
