---
id: mem-only-one-next-dev-can-run-1f7b
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:37:49.410Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/next.config.ts@cd5e4d2b441f
supersedes: null
fingerprint: only-one-next-dev-can-run
---

Only one `next dev` can run per client/ dir (Next 16 lock). If another agent's dev server is running (e.g. 3003 with API 4003), a second one on 3001 exits, so smoke-test against the running one. The cached Playwright npx packages need executablePath pointing at ~/Library/Caches/ms-playwright/chromium_headless_shell-1228.
