---
id: mem-admin-ui-kit-lives-in-client
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:54:18.524Z'
commit: acc53b766fc2d7539b5b09067f338d269f34f90b
files:
  - client/src/components/admin/README.md@6ce24e12dd9c
  - client/src/lib/admin/use-admin-list.ts@e0b3dc3b1747
  - client/src/app/admin/(panel)/layout.tsx@685adb0e74e0
supersedes: null
fingerprint: admin-kit-lives-client-src-components
---

Admin UI kit lives in client/src/components/admin (components, README.md) and client/src/lib/admin (adminApi, useAdminList URL-synced lists, useAdminQuery, useMutation with toasts, upload helper). Build new admin pages with it; the panel layout already wraps pages in ToastProvider + AdminSessionProvider + AdminShell, and a client component using useAdminList must be inside <Suspense>.
