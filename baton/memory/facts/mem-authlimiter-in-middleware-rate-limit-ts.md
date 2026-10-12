---
id: mem-authlimiter-in-middleware-rate-limit-ts
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:53:50.782Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/rate-limit.ts@a8bcd7e80c6f
  - server/src/modules/auth/auth.schemas.ts@7660556ed6f4
  - server/src/modules/auth/auth.service.ts@7d7d3e2e78ee
supersedes: null
fingerprint: authlimiter-middleware-rate-limit-one-shared
---

authLimiter in middleware/rate-limit.ts is one shared rateLimit instance, so login, signup, admin login, forgot and reset share a single 10-per-15-min per-IP budget. When curl-testing, restart the server to reset the in-memory store. Reuse the auth modules' field rules (emailField/mobileField/passwordField in auth.schemas.ts) and userSelect/hashPassword/verifyPassword (auth.service.ts) instead of redefining them.
