import { cartGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { itemParams, patchBody } from "@/server/modules/cart/cart.schemas";
import { capNotice, loadCart, removeItem, updateItemQuantity } from "@/server/modules/cart/cart.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** PATCH /api/cart/:itemId { quantity }: capped at stock. */
  PATCH: route({ ...cartGuard, params: itemParams, body: patchBody }, async ({ user, params, body }) => {
    const result = await updateItemQuantity(user.id, params.itemId, body.quantity);
    return { ...(await loadCart(user.id)), notice: capNotice(result) };
  }),

  /** DELETE /api/cart/:itemId */
  DELETE: route({ ...cartGuard, params: itemParams }, async ({ user, params }) => {
    await removeItem(user.id, params.itemId);
    return loadCart(user.id);
  }),
});
