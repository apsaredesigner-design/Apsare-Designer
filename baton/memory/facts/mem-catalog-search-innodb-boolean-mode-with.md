---
id: mem-catalog-search-innodb-boolean-mode-with
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:55:54.460Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/products/products.service.ts@4540811743e2
supersedes: null
fingerprint: catalog-search-innodb-boolean-mode-with
---

Catalog search: InnoDB BOOLEAN MODE with a required (+) stopword like "with"/"the" matches nothing, and Prisma `contains` does NOT escape LIKE wildcards (% and _) on MySQL. products.service.ts therefore drops stopwords and short words from the FULLTEXT expression and escapes wildcards with likeSafe() before `contains`.
