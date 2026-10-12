import { env } from "../../config/env";
import type { PaymentMethod } from "../../../generated/prisma/client";
import { HttpError } from "../../utils/http-error";

export type { PaymentMethod } from "../../../generated/prisma/client";

/**
 * Payment providers plug in behind this interface so Razorpay/Stripe can be
 * added later without touching the order flow.
 */

export interface CreatePaymentInput {
  orderId: number;
  amount: number;
  method: PaymentMethod;
}

export interface CreatePaymentResult {
  status: "PENDING" | "PAID";
  providerRef?: string;
  /** Data the client needs to open the provider's checkout (e.g. Razorpay order id). */
  clientPayload?: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  /** Methods this provider can take payment for. */
  methods: readonly PaymentMethod[];
  /** Whether the provider has a client-side checkout whose result must be verified via POST /api/payments/verify. */
  supportsVerify: boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(payload: Record<string, unknown>): Promise<boolean>;
}

export const codProvider: PaymentProvider = {
  name: "cod",
  methods: ["COD"],
  supportsVerify: false,
  async createPayment() {
    return { status: "PENDING" };
  },
  async verifyPayment() {
    return true;
  },
};

/** Register gateways here (e.g. `razorpay: razorpayProvider`) and select one with PAYMENT_PROVIDER. */
const registry: Record<string, PaymentProvider> = {
  cod: codProvider,
};

export function getProvider(name: string): PaymentProvider | undefined {
  return registry[name];
}

/** The online gateway selected by `env.paymentProvider` (falls back to cod when unknown). */
export function activeProvider(): PaymentProvider {
  return registry[env.paymentProvider] ?? codProvider;
}

/**
 * Picks the provider for a checkout payment method: COD is always handled by the
 * cod provider; online methods need the active gateway to support them.
 * Throws 400 PAYMENT_METHOD_UNAVAILABLE otherwise.
 */
export function providerForMethod(method: PaymentMethod): PaymentProvider {
  if (method === "COD") return codProvider;
  const provider = activeProvider();
  if (provider.methods.includes(method)) return provider;
  throw new HttpError(400, `${method} payments are not available yet. Please choose Cash on Delivery.`, "PAYMENT_METHOD_UNAVAILABLE");
}

/** Methods the checkout can offer right now. */
export function availableMethods(): PaymentMethod[] {
  return Array.from(new Set<PaymentMethod>(["COD", ...activeProvider().methods]));
}
