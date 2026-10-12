import { cartGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { capNotice } from "@/server/modules/cart/cart.service";
import { moveBody, productParams } from "@/server/modules/wishlist/wishlist.schemas";
import { moveToCart } from "@/server/modules/wishlist/wishlist.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** POST /api/wishlist/:productId/move-to-cart { variantId, quantity? } */
  POST: route({ ...cartGuard, params: productParams, body: moveBody }, async ({ user, params, body }) => {
    const { productId } = params;
    const result = await moveToCart(user.id, productId, body.variantId, body.quantity);
    return { productId, inWishlist: false, cartItem: result, notice: capNotice(result) };
  }),
});
