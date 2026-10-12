---
id: mem-session-revocation-compares-jwt-iat-seconds
type: decision
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:13:17.330Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/auth.ts@2c51408196a2
  - server/src/middleware/csrf.ts@6ee06c12d7d2
  - server/src/modules/users/users.routes.ts@abad705d5ac8
supersedes: null
fingerprint: session-revocation-compares-jwt-iat-seconds
---

Session revocation compares JWT iat (seconds) to floor(User.passwordChangedAt/1000), so the cookie re-issued in the same request by change-password stays valid; tests of old-cookie revocation need >=1s between login and change. All /api POST/PUT/PATCH/DELETE go through requireSameOrigin (Origin/Referer must equal CLIENT_URL if present, Content-Type must be JSON; multipart only under /api/uploads/), so new webhooks/uploads must fit that.
