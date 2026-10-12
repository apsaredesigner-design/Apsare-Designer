// Port of the removed Express suite's test/csrf.test.ts.
import { describe, expect, it } from "vitest";
import { checkSameOrigin } from "@/server/http/route";
import { expectError, newAgent, ORIGIN } from "./helpers/http";

const LOGIN = "/api/auth/login";
const LOGOUT = "/api/auth/logout";
const login = { identifier: "nobody@example.com", password: "whatever1" };
const request = () => newAgent();

describe("CSRF: same origin + JSON only (route() step 1)", () => {
  it("blocks a foreign Origin with 403 CSRF", async () => {
    const res = await request().post(LOGIN).set("Origin", "https://evil.example").send(login);
    expectError(res, 403, "CSRF");
  });

  it("blocks Origin: null and a foreign Referer", async () => {
    expectError(await request().post(LOGIN).set("Origin", "null").send(login), 403, "CSRF");
    expectError(await request().post(LOGIN).set("Referer", "https://evil.example/page").send(login), 403, "CSRF");
  });

  it("blocks a lookalike origin (different port / scheme)", async () => {
    expectError(await request().post(LOGIN).set("Origin", "http://localhost:3001").send(login), 403, "CSRF");
    expectError(await request().post(LOGIN).set("Origin", "https://localhost:3000").send(login), 403, "CSRF");
  });

  it("applies to unknown /api paths too (before the 404)", async () => {
    expectError(await request().post("/api/nope").set("Origin", "https://evil.example").send({}), 403, "CSRF");
  });

  it("rejects form-encoded and text/plain bodies with 415", async () => {
    const form = await request().post(LOGIN).set("Origin", ORIGIN).type("form").send("identifier=a&password=b");
    expectError(form, 415, "UNSUPPORTED_MEDIA_TYPE");
    const text = await request().post(LOGIN).set("Origin", ORIGIN).set("Content-Type", "text/plain").send(JSON.stringify(login));
    expectError(text, 415, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("rejects multipart outside /api/uploads", async () => {
    const res = await request().post("/api/contact").set("Origin", ORIGIN).field("name", "x");
    expectError(res, 415, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("allows multipart only under /api/uploads/", () => {
    const multipart = (path: string) =>
      new Request(`${ORIGIN}${path}`, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "multipart/form-data; boundary=x", "Content-Length": "10" } });
    expect(() => checkSameOrigin(multipart("/api/uploads/image"), "/api/uploads/image")).not.toThrow();
    expect(() => checkSameOrigin(multipart("/api/uploadsX"), "/api/uploadsX")).toThrow(/Content-Type/);
  });

  it("allows a request with no Origin and no Referer (curl, server-to-server)", async () => {
    const res = await request().post(LOGIN).send(login);
    expectError(res, 401, "INVALID_CREDENTIALS"); // reached the handler
  });

  it("allows the client origin, and a body-less POST without Content-Type", async () => {
    expectError(await request().post(LOGIN).set("Origin", ORIGIN).send(login), 401, "INVALID_CREDENTIALS");
    const logout = await request().post(LOGOUT).set("Origin", ORIGIN);
    expect(logout.status).toBe(200);
  });

  it("does not apply to safe methods", async () => {
    const res = await request().get("/api/health").set("Origin", "https://evil.example");
    expect(res.status).toBe(200);
  });
});
