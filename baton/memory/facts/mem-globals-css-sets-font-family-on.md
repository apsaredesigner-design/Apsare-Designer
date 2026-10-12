---
id: mem-globals-css-sets-font-family-on
type: gotcha
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T13:49:13.873Z'
commit: acc53b766fc2d7539b5b09067f338d269f34f90b
files:
  - client/src/app/globals.css@cbe37f885026
  - client/src/components/layout/Footer.tsx@876a588dd5f6
  - client/src/components/product/ProductView.tsx@d2fcf283901a
supersedes: null
fingerprint: globals-css-sets-font-family-unlayered
---

globals.css sets font-family on h1/h2/h3 as unlayered CSS, which beats Tailwind 4 utilities (they live in a layer), so `font-sans` on an h2 is ignored. Use a <p> for small UI headings, or scope the global rule. Also: storefront copy must not promise things the business hasn't decided (returns window, dispatch time, 'certified/100% genuine', a newsletter with no backend); only COD and delivery via serviceable pincodes are real.
