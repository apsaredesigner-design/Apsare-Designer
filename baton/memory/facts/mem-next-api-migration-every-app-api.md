---
id: mem-next-api-migration-every-app-api
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T14:12:28.360Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - client/src/server/http/route.ts@fe72b91b5358
  - client/src/server/http/client-ip.ts@72bf490e3f6a
  - MIGRATION.md@8a955f8ccdae
supersedes: null
fingerprint: next-api-migration-every-app-api
---

Next API migration: every app/api/**/route.ts must go through route() from client/src/server/http/route.ts and export all five methods via `export const { GET, POST, PUT, PATCH, DELETE } = methods({...})`, otherwise Next answers an empty 405 where Express answered 404 JSON. Without TRUST_PROXY=1 the client IP is "unknown" (Route Handlers can't see the socket), so all guests share one IP rate-limit bucket.
