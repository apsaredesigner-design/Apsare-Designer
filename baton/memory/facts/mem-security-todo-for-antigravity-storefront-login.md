---
id: mem-security-todo-for-antigravity-storefront-login
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:20:48.699Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/src/app/(store)/(auth)/login/page.tsx@dd4ea787ee48
  - client/src/app/(store)/(auth)/signup/page.tsx@9c2ab330507e
  - client/src/proxy.ts@efbc5f6f1105
supersedes: null
fingerprint: security-todo-for-antigravity-storefront-login
---

SECURITY TODO for Antigravity: storefront login/signup pages pass ?redirect= straight into router.push (open redirect to external sites after login). Accept only same-origin relative paths: must start with '/', not '//', no '\\', and new URL(v, location.origin).origin === location.origin; else fall back to '/'. proxy.ts sends /account/* to /login?redirect=<path>.
