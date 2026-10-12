---
id: mem-client-and-server-test-suites-npm
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T14:12:28.407Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - client/test/helpers/http.ts@26556a68b68c
  - client/test/helpers/router.ts@1c9fb02111dc
  - client/vitest.config.ts@ce6c4cb55cdf
supersedes: null
fingerprint: client-and-server-test-suites-npm
---

client and server test suites (npm test -w client / -w server) both wipe and reseed the same apsare_test DB, so never run them concurrently. Client tests call Route Handlers in-process via client/test/helpers/http.ts (newAgent() replaces supertest's request(app)); test-only routes live in client/test/fixtures/api and are mounted at /api.
