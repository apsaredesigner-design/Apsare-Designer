---
id: mem-express-5-makes-req-query-a
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:48:29.501Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/middleware/validate.ts@cfedb4243b61
  - server/src/middleware/error.ts@6753a6d97f09
supersedes: null
fingerprint: express-makes-req-query-read-only
---

Express 5 makes req.query a read-only getter, so validate() puts the parsed query and params on req.validated.query / req.validated.params (cast with z.infer<typeof schema>) and only replaces req.body. Express 5 also forwards rejected promises, so async handlers can simply throw HttpError and need no asyncHandler wrapper.
