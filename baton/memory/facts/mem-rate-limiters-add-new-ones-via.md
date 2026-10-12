---
id: mem-rate-limiters-add-new-ones-via
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:49:52.199Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/rate-limit.ts@7b82e85f392b
  - server/src/lib/mailer.ts@1c59e518a0ed
  - server/src/utils/search.ts@cfbad92f9acd
  - server/src/modules/admin/admin.shared.ts@6c464622da7c
supersedes: null
fingerprint: rate-limiters-add-new-ones-via
---

Rate limiters: add new ones via the `limiter(name, windowMs, limit, opts)` factory in middleware/rate-limit.ts, mounted AFTER requireAuth/optionalAuth so they key per user (else IP via ipKeyGenerator). RATE_LIMIT_<NAME> overrides a limit; NODE_ENV=test or RATE_LIMIT_DISABLED=1 disables all. Emails must go through sendMail() in lib/mailer.ts (fire-and-forget, never awaited, escapeHtml user text). Prisma `contains` does NOT escape % and _: use likeSafe from utils/search.ts (admin searchTerm already does).
