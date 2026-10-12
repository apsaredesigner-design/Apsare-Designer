import { cartGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { productParams } from "@/server/modules/wishlist/wishlist.schemas";
import { removeFromWishlist } from "@/server/modules/wishlist/wishlist.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** DELETE /api/wishlist/:productId: idempotent. */
  DELETE: route({ ...cartGuard, params: productParams }, ({ user, params }) => removeFromWishlist(user.id, params.productId)),
});
