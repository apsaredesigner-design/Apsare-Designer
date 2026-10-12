---
id: mem-next-16-under-next-start-matches
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T14:58:52.892Z'
commit: 9a60f3d18d338355008341835032b14069881867
files:
  - client/test/helpers/router.ts@73acbff1d6ba
  - client/test/helpers/http.ts@f1bc4d84aca5
supersedes: null
fingerprint: next-under-next-start-matches-static
---

Next 16 under `next start` matches static App Router folders against the RAW (still %-encoded) segment and only decodeURIComponent-s dynamic params (so /api/products/hom%65 hits [slug]="home", %2F stays inside one param), and a malformed escape gives a plain-text 500 before any handler. test/helpers/router.ts mirrors this; keep it in sync if Next changes.
