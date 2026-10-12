---
id: mem-admin-list-date-filters-orders-audit
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:14:48.555Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/src/lib/admin/resources/orders.ts@caf27dbb265d
  - client/src/components/admin/ops/shared/DateRangeFilter.tsx@0446448ef299
  - client/src/lib/admin/api.ts@faac4c7dfa2e
  - client/src/components/admin/ops/shared/useExpiredRedirect.ts@6a5605444d88
supersedes: null
fingerprint: admin-list-date-filters-orders-audit
---

Admin list date filters (orders, audit log) store IST day bounds in the URL as ISO strings with +05:30 (istStartOfDay/istEndOfDay in lib/admin/resources/orders.ts), because useAdminList sends URL filters to the API verbatim and the server treats bare dates as UTC. Also: useAdminQuery does not redirect on 401; ops pages call useExpiredRedirect(error), and adminGet/adminSend in lib/admin/api.ts redirect to /admin/login?reason=expired.
