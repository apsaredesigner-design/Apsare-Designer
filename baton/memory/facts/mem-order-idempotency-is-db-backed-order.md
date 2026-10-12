---
id: mem-order-idempotency-is-db-backed-order
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:49:52.154Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/orders/orders.service.ts@4a17886c0bcc
  - server/src/lib/prisma.ts@5b767d9edcec
  - server/prisma/schema.prisma@2a133ec70a78
supersedes: null
fingerprint: order-idempotency-backed-order-idempotencykey-userid
---

Order idempotency is DB-backed: Order.idempotencyKey = `${userId}:${key}` (unique, globally omitted from Prisma results via `omit` in lib/prisma.ts). placeOrderTx locks the User row FOR UPDATE first, which serialises a user's checkouts (same-key replays, per-user coupon rules). `prisma migrate dev` refuses to run non-interactively when adding a unique column; generate SQL with `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` into a new migration folder (strip the 'Loaded Prisma config' line), then `prisma migrate deploy`.
