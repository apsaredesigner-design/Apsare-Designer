import { expect } from "vitest";
import { createAddress, createUser } from "./factories";
import { api, loginWith, type Api } from "./http";

/** A fresh customer with a live session. */
export async function shopper(opts: { fullName?: string } = {}) {
  const user = await createUser(opts);
  return { user, api: api(await loginWith(user.email, user.password)) };
}

/** Fills the cart through the API. */
export async function fillCart(client: Api, lines: { variantId: number; quantity?: number }[]) {
  for (const l of lines) {
    const res = await client.post("/api/cart", { variantId: l.variantId, quantity: l.quantity ?? 1 });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  }
}

export interface PlaceOpts {
  addressId?: number;
  pincode?: string;
  paymentMethod?: "COD" | "UPI" | "CARD" | "NET_BANKING";
  couponCode?: string;
  idempotencyKey?: string;
}

/** POST /api/orders (creates a delivery address first unless `addressId` is given). Returns the raw response. */
export async function placeOrder(client: Api, userId: number, opts: PlaceOpts = {}) {
  const addressId = opts.addressId ?? (await createAddress(userId, { pincode: opts.pincode })).id;
  const req = client.post("/api/orders", {
    addressId,
    paymentMethod: opts.paymentMethod ?? "COD",
    ...(opts.couponCode ? { couponCode: opts.couponCode } : {}),
  });
  if (opts.idempotencyKey) req.set("Idempotency-Key", opts.idempotencyKey);
  return req;
}

/** Cart + order in one go; asserts the 201 and returns the OrderDetail. */
export async function checkout(client: Api, userId: number, lines: { variantId: number; quantity?: number }[], opts: PlaceOpts = {}) {
  await fillCart(client, lines);
  const res = await placeOrder(client, userId, opts);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as { orderNumber: string; id: number; [k: string]: unknown };
}
