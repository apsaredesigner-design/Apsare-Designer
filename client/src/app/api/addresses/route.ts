import { userGuard } from "@/server/http/guards";
import { created, guardedMethods, route } from "@/server/http/route";
import { createAddressSchema } from "@/server/modules/addresses/addresses.schemas";
import { createAddress, listAddresses } from "@/server/modules/addresses/addresses.service";

// Express: router.use(requireAuth)
/** GET /api/addresses → { items }; POST /api/addresses → 201 { address }. Signed in. */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  GET: route(userGuard, async (ctx) => ({ items: await listAddresses(ctx.user.id) })),
  POST: route({ ...userGuard, body: createAddressSchema }, async (ctx) => created({ address: await createAddress(ctx.user.id, ctx.body) })),
});
