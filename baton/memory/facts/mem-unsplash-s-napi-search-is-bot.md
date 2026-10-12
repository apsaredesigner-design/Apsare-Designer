---
id: mem-unsplash-s-napi-search-is-bot
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:48:29.652Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - client/public/images/CREDITS.md@cd20ca09df49
  - server/prisma/seed.ts@efa9546b73fe
supersedes: null
fingerprint: unsplash-napi-search-bot-walled-anubis
---

Unsplash's napi search is bot-walled (Anubis). To get images, find photo short IDs via web search, then `curl -sI https://unsplash.com/photos/<id>/download?force=true` (no browser UA); the Location header is the images.unsplash.com URL, and its dl= param carries the photographer slug. Unsplash+ photos return no redirect. Credits live in client/public/images/CREDITS.md.
