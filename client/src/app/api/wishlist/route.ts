import { cartGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { addBody } from "@/server/modules/wishlist/wishlist.schemas";
import { addToWishlist, listWishlist } from "@/server/modules/wishlist/wishlist.service";
import { paginationQuery } from "@/server/utils/pagination";

// Express: router.use(requireAuth, noStore, cartLimiter)
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {
  /** GET /api/wishlist?page=&limit= */
  GET: route({ ...cartGuard, query: paginationQuery }, ({ user, query }) => listWishlist(user.id, query)),

  /** POST /api/wishlist { productId }: idempotent (201 when added, 200 when already there). */
  POST: route({ ...cartGuard, body: addBody }, async ({ user, body, setStatus }) => {
    const result = await addToWishlist(user.id, body.productId);
    setStatus(result.added ? 201 : 200);
    return result;
  }),
});
