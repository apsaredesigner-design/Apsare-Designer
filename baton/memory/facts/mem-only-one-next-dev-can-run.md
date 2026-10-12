---
id: mem-only-one-next-dev-can-run
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:14:48.608Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/src/components/admin/DataTable.tsx@db1db1c8ee2b
supersedes: null
fingerprint: only-one-next-dev-can-run
---

Only one `next dev` can run per client/ directory (Next 16 writes .next/dev/lock), so a second agent's dev server on another port is refused. Also, a visually hidden (sr-only, position:absolute) header inside DataTable escapes its overflow-x-auto wrapper and causes page-level horizontal scroll at 390px, so use a visible header text instead.
