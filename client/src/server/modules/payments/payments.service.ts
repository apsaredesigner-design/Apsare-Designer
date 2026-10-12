import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";
import type { VerifyBody } from "./payments.schemas";
import { activeProvider, getProvider } from "./provider";

/** Delivery serviceability, COD availability and ETA (today UTC + deliveryDays, YYYY-MM-DD). */
export async function checkPincode(pincode: string) {
  const row = await prisma.serviceablePincode.findUnique({ where: { pincode } });
  if (!row) return { pincode, serviceable: false, codAvailable: false, deliveryDays: null, estimatedDelivery: null };
  const eta = new Date();
  eta.setUTCDate(eta.getUTCDate() + row.deliveryDays);
  return {
    pincode,
    serviceable: true,
    codAvailable: row.codAvailable,
    deliveryDays: row.deliveryDays,
    estimatedDelivery: eta.toISOString().slice(0, 10),
  };
}

/**
 * Stub for future gateways: after the client-side checkout finishes, verify the
 * gateway's signature and mark the latest payment and the order PAID.
 */
export async function verifyPayment(userId: number, body: VerifyBody) {
  const provider = body.provider ? getProvider(body.provider) : activeProvider();
  if (!provider) throw new HttpError(400, `Unknown payment provider "${body.provider}"`, "UNKNOWN_PROVIDER");
  if (!provider.supportsVerify) {
    throw new HttpError(501, `Payment verification is not applicable for provider "${provider.name}"`);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber: body.orderNumber, userId },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) throw new HttpError(404, "Order not found");

  // Signature check happens inside provider.verifyPayment (HMAC of order id + payment id).
  const ok = await provider.verifyPayment(body.payload);
  if (!ok) throw new HttpError(400, "Payment verification failed", "PAYMENT_VERIFICATION_FAILED");

  const payment = order.payments[0];
  await prisma.$transaction([
    ...(payment ? [prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", raw: body.payload as Prisma.InputJsonValue } })] : []),
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } }),
  ]);
  return { orderNumber: order.orderNumber, paymentStatus: "PAID" as const };
}
