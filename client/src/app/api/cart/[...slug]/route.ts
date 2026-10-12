import { guardedMethods } from "@/server/http/route";
import { cartGuard } from "@/server/http/guards";

/** Any /api/cart path no other route.ts matches: the router-level middleware, then Express's 404. */
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(cartGuard, {});
