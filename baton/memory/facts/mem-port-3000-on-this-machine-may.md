---
id: mem-port-3000-on-this-machine-may
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:54:18.571Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/config/env.ts@8c44749f7902
  - client/src/lib/api.ts@2a90ea5c729a
supersedes: null
fingerprint: port-3000-this-machine-may-taken
---

Port 3000 on this machine may be taken by another project's Next dev server, and the API's CLIENT_URL (CORS/CSRF) is http://localhost:3000. To test the client on another port without editing server files, run a second API with PORT=4001 CLIENT_URL=http://localhost:3001 and the client with NEXT_PUBLIC_API_URL=http://localhost:4001/api next dev -p 3001.
