import { userGuard } from "@/server/http/guards";
import { guardedMethods, noContent, route } from "@/server/http/route";
import { addressIdParams, updateAddressSchema } from "@/server/modules/addresses/addresses.schemas";
import { deleteAddress, updateAddress } from "@/server/modules/addresses/addresses.service";

/** PATCH /api/addresses/:id → { address }; DELETE → 204. Signed in. */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  PATCH: route({ ...userGuard, params: addressIdParams, body: updateAddressSchema }, async (ctx) => ({
    address: await updateAddress(ctx.user.id, ctx.params.id, ctx.body),
  })),
  DELETE: route({ ...userGuard, params: addressIdParams }, (ctx) => deleteAddress(ctx.user.id, ctx.params.id).then(noContent)),
});
