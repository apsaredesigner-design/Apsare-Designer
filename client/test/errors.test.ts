// Port of the removed Express suite's test/errors.test.ts (same paths and assertions), plus a few
// Next-specific cases (deep unknown paths, 404 instead of Next's 405, strict JSON).
import { describe, expect, it } from "vitest";
import { api, expectError, loginAs, newAgent, ORIGIN } from "./helpers/http";

describe("error shape: { error: { message, code, details? } }, never a stack", () => {
  it("health works", async () => {
    expect((await api().get("/api/health")).body).toEqual({ ok: true });
  });

  it("unknown route → 404 NOT_FOUND", async () => {
    expectError(await api().get("/api/nope"), 404, "NOT_FOUND");
    expectError(await api().post("/api/nope", {}), 404, "NOT_FOUND");
    const err = expectError(await api().get("/api/nope/deeper/still"), 404, "NOT_FOUND");
    expect(err.message).toBe("Route not found: GET /api/nope/deeper/still");
    // A method the route doesn't implement is Express's 404 too, not Next's 405.
    expectError(await api().put("/api/health", {}), 404, "NOT_FOUND");
  });

  it("malformed JSON → 400 BAD_REQUEST without parser internals", async () => {
    const res = await newAgent().post("/api/auth/login").set("Origin", ORIGIN).set("Content-Type", "application/json").send('{"identifier": ');
    const err = expectError(res, 400, "BAD_REQUEST");
    expect(err.details).toBeUndefined();
    // strict mode: only objects/arrays at the top level
    expectError(await newAgent().post("/api/auth/login").set("Origin", ORIGIN).set("Content-Type", "application/json").send('"just a string"'), 400, "BAD_REQUEST");
  });

  it("a body over 1 MB → 413 PAYLOAD_TOO_LARGE", async () => {
    const res = await api().post("/api/contact", { name: "x".repeat(1_100_000) });
    expectError(res, 413, "PAYLOAD_TOO_LARGE");
  });

  it("validation errors carry prefixed detail paths", async () => {
    const err = expectError(await api().get("/api/products?limit=abc&minRating=9"), 400, "VALIDATION_ERROR");
    expect(err.details!.map((d) => d.path).sort()).toEqual(["query.limit", "query.minRating"]);
    const params = expectError(await api().get("/api/categories/Not_A_Slug!"), 400, "VALIDATION_ERROR");
    expect(params.details![0].path).toMatch(/^params\./);
  });

  it("401 / 403 / 404 / 409 / 501 all share the shape", async () => {
    expectError(await api().get("/api/orders"), 401, "UNAUTHENTICATED");
    const customer = api(await loginAs("customer"));
    expectError(await customer.get("/api/admin/dashboard"), 403, "FORBIDDEN");
    expectError(await api().get("/api/products/no-such-product"), 404, "NOT_FOUND");
    expectError(await customer.get("/api/orders/APS-000000-AAAAA"), 404, "NOT_FOUND");
    expectError(await customer.post("/api/payments/verify", { orderNumber: "APS-000000-AAAAA", payload: {} }), 501, "NOT_IMPLEMENTED");
    const admin = api(await loginAs("admin"));
    const dup = expectError(await admin.post("/api/admin/settings/pincodes", { pincode: "560001" }), 409, "CONFLICT");
    expect(dup.details?.[0].path).toBe("pincode");
  });
});
