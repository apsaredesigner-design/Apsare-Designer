import { cartGuard } from "@/server/http/guards";
import { route, staticTwin } from "@/server/http/route";
import { mergeBody } from "@/server/modules/cart/cart.schemas";
import { loadCart, mergeCart } from "@/server/modules/cart/cart.service";
import * as byItem from "../[itemId]/route";

/** Other methods fall through to `/:itemId` (PATCH/DELETE → 400 params.itemId), as in Express. */
export const { GET, POST, PUT, PATCH, DELETE } = staticTwin(byItem, { itemId: "merge" }, {
  /** POST /api/cart/merge { items: [{ variantId, quantity }] }: guest cart after login. */
  POST: route({ ...cartGuard, body: mergeBody }, async ({ user, body }) => {
    const result = await mergeCart(user.id, body.items);
    return { ...(await loadCart(user.id)), ...result };
  }),
});
