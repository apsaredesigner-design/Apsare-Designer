import { methods, route } from "@/server/http/route";
import { listAvailableCoupons } from "@/server/modules/coupons/coupons.service";

export const { GET, POST, PUT, PATCH, DELETE } = methods({
  /** GET /api/coupons/available: signed-in users also get eligibility against their cart. */
  GET: route({ auth: "optional", cache: "no-store" }, ({ user }) => listAvailableCoupons(user?.id)),
});
