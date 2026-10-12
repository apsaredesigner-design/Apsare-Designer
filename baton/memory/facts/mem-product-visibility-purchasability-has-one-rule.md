---
id: mem-product-visibility-purchasability-has-one-rule
type: convention
agent: claude
author: rakshanshetty2003@gmail.com
task: null
created: '2026-09-26T12:19:52.359Z'
commit: 759fd16b36a58d8995ff658b9864b899a775e17b
files:
  - server/src/modules/products/products.service.ts@cae7939b356c
  - server/src/modules/orders/orders.service.ts@454d33fa6fca
  - server/src/modules/cart/cart.service.ts@dd011371001c
supersedes: null
fingerprint: product-visibility-purchasability-has-one-rule
---

Product visibility/purchasability has ONE rule: purchasableProductWhere() / isPurchasable() / visibleCategoryIds() in products.service.ts (active product + category and every ancestor active, any depth, same set as loadCategoryIndex). Cart, wishlist, order placement (409 PRODUCT_UNAVAILABLE), home rails and detail all use it; never re-check isActive alone. Order cancellation (customer and admin) must go through cancelOrderTx in orders.service.ts.
