import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { addressIdParams } from "@/server/modules/addresses/addresses.schemas";
import { setDefaultAddress } from "@/server/modules/addresses/addresses.service";

/** PATCH /api/addresses/:id/default → { address }. Signed in. */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  PATCH: route({ ...userGuard, params: addressIdParams }, async (ctx) => ({
    address: await setDefaultAddress(ctx.user.id, ctx.params.id),
  })),
});
