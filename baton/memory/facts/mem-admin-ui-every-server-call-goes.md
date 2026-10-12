---
id: mem-admin-ui-every-server-call-goes
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:37:49.363Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/src/lib/admin/api.ts@4e549f7d8612
  - client/src/lib/admin/types.ts@cacef3f530c5
  - client/src/components/admin/README.md@6ce24e12dd9c
  - client/src/components/admin/icons.tsx@c0ed999b3884
supersedes: null
fingerprint: admin-every-server-call-goes-through
---

Admin UI: every server call goes through adminApi in client/src/lib/admin/api.ts (or useAdminList/useAdminQuery via adminGet), types live only in lib/admin/types.ts, and lib/admin/helpers/* holds pure helpers/constants (no network). Page-level shared pieces (Section, LoadError, Thumb, PageFallback, Stars, DateRangeFilter, useCategoryTree) live in components/admin/shared/; icons only in components/admin/icons.tsx via make().
