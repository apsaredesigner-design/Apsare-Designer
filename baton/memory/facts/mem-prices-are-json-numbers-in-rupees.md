---
id: mem-prices-are-json-numbers-in-rupees
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: sess-p66989
created: '2026-09-26T11:50:45.749Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - docs/API.md@9450d7ada129
  - server/src/modules/orders/orders.status.ts@029415c5c9cb
  - server/src/modules/addresses/addresses.routes.ts@809187f0882c
  - server/src/modules/auth/auth.routes.ts@99a03aba7f8e
  - server/src/modules/categories/categories.routes.ts@ade726921de5
  - server/src/modules/orders/orders.routes.ts@99ebbc3e3b4e
  - server/src/modules/orders/orders.service.ts@4a17886c0bcc
  - server/src/modules/payments/payments.routes.ts@c1c3a335075c
supersedes: null
fingerprint: prices-are-json-numbers-rupees-discountpercent
---

Prices are JSON numbers in rupees; discountPercent is computed on the server; never send prices from the client
