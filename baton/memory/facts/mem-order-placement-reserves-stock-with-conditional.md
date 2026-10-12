---
id: mem-order-placement-reserves-stock-with-conditional
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:55:07.539Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/orders/orders.service.ts@8745cd938a14
  - server/src/modules/orders/orders.status.ts@029415c5c9cb
  - server/src/modules/payments/provider.ts@fb0cb719cc33
supersedes: null
fingerprint: order-placement-reserves-stock-with-conditional
---

Order placement reserves stock with conditional updateMany (stock >= qty) inside one interactive tx; order/customer status changes must go through orders.status.ts assertTransition, and cancellation claims via conditional updateMany on status to avoid double-restock. Idempotency-Key cache is in-process memory only (single instance); multi-instance needs an Order.idempotencyKey unique column. COD fee is folded into Order.deliveryCharge (no separate column).
