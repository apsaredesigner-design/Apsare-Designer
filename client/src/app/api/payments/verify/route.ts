import { userGuard } from "@/server/http/guards";
import { guardedMethods, route } from "@/server/http/route";
import { verifyBody } from "@/server/modules/payments/payments.schemas";
import { verifyPayment } from "@/server/modules/payments/payments.service";

export const { GET, POST, PUT, PATCH, DELETE } = guardedMethods(userGuard, {
  /** POST /api/payments/verify (user): stub for future gateways (501 for cod). */
  POST: route({ ...userGuard, body: verifyBody }, ({ user, body }) => verifyPayment(user.id, body)),
});
