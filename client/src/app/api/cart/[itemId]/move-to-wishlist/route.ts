import { cartGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { itemParams } from "@/server/modules/cart/cart.schemas";
import { loadCart, moveToWishlist } from "@/server/modules/cart/cart.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** POST /api/cart/:itemId/move-to-wishlist */
  POST: route({ ...cartGuard, params: itemParams }, async ({ user, params }) => {
    await moveToWishlist(user.id, params.itemId);
    return loadCart(user.id);
  }),
});
