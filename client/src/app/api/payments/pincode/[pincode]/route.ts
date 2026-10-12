import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { pincodeParams } from "@/server/modules/payments/payments.schemas";
import { checkPincode } from "@/server/modules/payments/payments.service";

// Express: the public GETs sit before `router.use(requireAuth)`, so other methods hit auth first.
export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** GET /api/payments/pincode/:pincode (public): serviceability, COD and ETA. */
  GET: route({ params: pincodeParams }, ({ params }) => checkPincode(params.pincode)),
});
