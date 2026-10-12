// The route() wrapper itself (src/server/http/route.ts), through the fixture route.
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { ipKeyGenerator } from "@/server/http/client-ip";
import { resolveRoute } from "./helpers/router";
import { ADMIN, api, CUSTOMER, expectError, loginWith, newAgent } from "./helpers/http";
import { createUser } from "./helpers/factories";
import { db } from "./helpers/db";

const F = "/api/test-fixture";
const customer = async () => api(await loginWith(CUSTOMER.email, CUSTOMER.password));

describe("route(): responses", () => {
  it("serialises Prisma Decimals as numbers, like the Express json replacer", async () => {
    const res = await api().get(`${F}/decimal`);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.body).toEqual({ price: 1499.5, lines: [{ total: 2 }], label: "x" });
  });

  it("setStatus + data, and 204 with an empty body", async () => {
    const created = await api().post(`${F}/echo`, { name: "a" });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ name: "a" });
    const empty = await api().post(`${F}/empty`);
    expect(empty.status).toBe(204);
    expect(empty.text).toBe("");
  });

  it("created() and noContent() match setStatus(201) / setStatus(204), keeping the wrapper's headers", async () => {
    const res = await api().post(`${F}/created`);
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.body).toEqual({ price: 2.5 });
    expect(res.headers["set-cookie"]).toEqual([expect.stringMatching(/^seen=1; Path=\//)]);
    const none = await api().post(`${F}/no-content`);
    expect(none.status).toBe(204);
    expect(none.text).toBe("");
  });

  it("a handler-built Response keeps its type and gains the wrapper's cookies and headers", async () => {
    const res = await api().get(`${F}/csv`);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.text).toBe("a,b\n1,2\n");
    expect(res.headers["set-cookie"]).toEqual([expect.stringMatching(/^seen=1; Path=\//)]);
  });

  it("rawBody still parses a JSON body (express.json ran before multer); multipart is left to the handler (uploads tests)", async () => {
    expect((await api().post(`${F}/raw`, { a: "b" })).body).toEqual({ parsed: { a: "b" } });
    expectError(await newAgent().post(`${F}/raw`).set("Content-Type", "application/json").send("{bad"), 400, "BAD_REQUEST");
    // No JSON body: nothing is read, so the handler still has the (empty) stream.
    expect((await api().post(`${F}/raw`)).body).toEqual({ bytes: 0 });
  });
});

describe("route(): error mapping (middleware/error.ts)", () => {
  it("P2025 → 404, P2002 on a primary key → 409 without details, ZodError in a handler → 400 without prefixes", async () => {
    expectError(await api().get(`${F}/record-not-found`), 404, "NOT_FOUND");
    const admin = api(await loginWith(ADMIN.email, ADMIN.password));
    const dup = expectError(await admin.post(`${F}/conflict-primary`, { pincode: "560001" }), 409, "CONFLICT");
    expect(dup.details).toBeUndefined();
    const zod = expectError(await api().get(`${F}/zod-in-handler`), 400, "VALIDATION_ERROR");
    expect(zod.details?.[0].path).toBe("n");
  });

  it("an unexpected error → 500 INTERNAL with the message outside production, never a stack", async () => {
    const err = expectError(await api().get(`${F}/boom`), 500, "INTERNAL");
    expect(err.message).toBe("kaboom");
  });
});

describe("route(): auth (middleware/auth.ts)", () => {
  it("session cookie flags match Express (httpOnly, Lax, path /, 7d; cleared on logout)", async () => {
    const agent = newAgent();
    const res = await api(agent).post("/api/auth/login", { identifier: CUSTOMER.email, password: CUSTOMER.password });
    const cookie = [res.headers["set-cookie"]].flat()[0]!;
    expect(cookie).toMatch(/^token=[^;]+; Max-Age=604800; Path=\/; Expires=[^;]+; HttpOnly; SameSite=Lax$/);
    const out = await api(agent).post("/api/auth/logout");
    expect([out.headers["set-cookie"]].flat()[0]).toMatch(/^token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax$/);
    expectError(await api(agent).get(`${F}/me`), 401, "UNAUTHENTICATED");
  });

  it("accepts a Bearer token; rejects other algorithms, disabled users and pre-password-change tokens", async () => {
    const user = await createUser();
    const secret = process.env.JWT_SECRET!;
    const sign = (opts: jwt.SignOptions = {}) => jwt.sign({ id: user.id, role: "CUSTOMER" }, secret, opts);
    const bearer = (token: string) => newAgent().get(`${F}/me`).set("Authorization", `Bearer ${token}`);

    expect((await bearer(sign())).body.user).toEqual({ id: user.id, role: "CUSTOMER" });
    expectError(await bearer(sign({ algorithm: "HS512" })), 401, "UNAUTHENTICATED");
    expectError(await bearer(jwt.sign({ role: "CUSTOMER" }, secret)), 401, "UNAUTHENTICATED");

    const old = sign({ noTimestamp: false });
    await db.user.update({ where: { id: user.id }, data: { passwordChangedAt: new Date(Date.now() + 2000) } });
    expect((await bearer(old)).body.error.message).toMatch(/log in again/);
    await db.user.update({ where: { id: user.id }, data: { passwordChangedAt: null, isActive: false } });
    expect((await bearer(old)).body.error.message).toMatch(/disabled/);
  });

  it("role comes from the database, not the token", async () => {
    const user = await createUser();
    const forged = jwt.sign({ id: user.id, role: "ADMIN" }, process.env.JWT_SECRET!);
    expectError(await newAgent().get(`${F}/admin`).set("Authorization", `Bearer ${forged}`), 403, "FORBIDDEN");
  });

  it("optional auth treats a bad token as a guest", async () => {
    const res = await newAgent().get(`${F}/optional`).set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});

describe("route(): cache headers (products/cache.ts)", () => {
  it("public for guests, private when signed in; no-store for per-user routes", async () => {
    const guest = await api().get(`${F}/cached`);
    expect(guest.headers["cache-control"]).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(guest.headers.vary).toBe("Cookie, Authorization");
    const me = await customer();
    expect((await me.get(`${F}/cached`)).headers["cache-control"]).toBe("private, no-store");
    expect((await me.get(`${F}/no-store`)).headers["cache-control"]).toBe("private, no-store");
  });
});

describe("harness: route resolution and IP keys", () => {
  it("static beats [param] beats [...catchAll]", () => {
    expect(resolveRoute("/api/health")?.file).toMatch(/app\/api\/health\/route\.ts$/);
    expect(resolveRoute("/api/test-fixture/me")).toMatchObject({ params: { op: "me" } });
    expect(resolveRoute("/api/a/b")).toMatchObject({ params: { slug: ["a", "b"] } });
    expect(resolveRoute("/nope")).toBeNull();
  });

  it("ipKeyGenerator groups IPv6 by /56 and unwraps IPv4-mapped addresses", () => {
    expect(ipKeyGenerator("203.0.113.5")).toBe("203.0.113.5");
    expect(ipKeyGenerator("::ffff:203.0.113.5")).toBe("203.0.113.5");
    expect(ipKeyGenerator("2001:db8:abcd:12ff:1::1")).toBe(ipKeyGenerator("2001:db8:abcd:1200::9"));
    expect(ipKeyGenerator("2001:db8:abcd:12ff::1")).not.toBe(ipKeyGenerator("2001:db8:abcd:1300::1"));
  });
});
