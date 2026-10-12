---
id: mem-cart-checkout-money-maths-lives-only
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T11:55:02.063Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/cart/cart.pricing.ts@1657310c85ed
  - server/src/modules/cart/cart.service.ts@3e4280db94e5
supersedes: null
fingerprint: cart-checkout-money-maths-lives-only
---

Cart/checkout money maths lives only in server/src/modules/cart/cart.pricing.ts (computeCartSummary, validateCoupon, getStoreSettings): integer paise internally, rupees rounded to 2dp out; free shipping judged on pre-coupon subtotal; codFee only with opts {cod:true}. Orders must re-price with these (pass tx) rather than duplicating logic; loadCart/addToCart in cart.service.ts give the full cart shape.
