import type { OrderStatus } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";

/**
 * Allowed order status transitions. Orders move forward one step at a time;
 * cancellation is only possible before packing. DELIVERED and CANCELLED are final.
 * Shared by the customer cancel flow and the admin status update.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Statuses from which an order may still be cancelled (and restocked). */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = ["PLACED", "CONFIRMED"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Throws 409 INVALID_STATUS_TRANSITION when `from → to` is not allowed. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new HttpError(409, `Cannot change order status from ${from} to ${to}`, "INVALID_STATUS_TRANSITION");
  }
}
