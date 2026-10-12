import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { activeProvider, availableMethods } from "@/server/modules/payments/provider";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** GET /api/payments/methods (public): which checkout payment methods are live. */
  GET: route({}, () => ({ provider: activeProvider().name, methods: availableMethods() })),
});
