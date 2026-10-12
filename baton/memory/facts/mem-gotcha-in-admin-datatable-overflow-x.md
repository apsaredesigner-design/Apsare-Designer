---
id: mem-gotcha-in-admin-datatable-overflow-x
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:17:36.295Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/src/components/admin/DataTable.tsx@db1db1c8ee2b
  - client/src/components/admin/catalog/reviews/reviewColumns.tsx@d190de5ed989
supersedes: null
fingerprint: gotcha-admin-datatable-overflow-auto-region
---

Gotcha: in admin DataTable (overflow-x-auto region), an sr-only element in a far-right cell/header is absolutely positioned against the page, not the scroller, so it widens the whole page at 390px. Give that column headerClassName/className "relative". Also, parallel agents share the Playwright MCP browser, so run isolated QA with your own headless Chromium script.
