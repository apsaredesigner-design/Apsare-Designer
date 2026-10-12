// Port of the removed Express suite's test/rate-limit.test.ts. The only file with real rate limiting:
// NODE_ENV=test switches every limiter off, so this file flips NODE_ENV before any
// route (and src/server/config/env.ts) is imported, and shrinks the login limiter
// with its RATE_LIMIT_LOGIN override.
import { afterAll, describe, expect, it, vi } from "vitest";

const saved = vi.hoisted(() => {
  const keep = { NODE_ENV: process.env.NODE_ENV, RATE_LIMIT_LOGIN: process.env.RATE_LIMIT_LOGIN, RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED };
  (process.env as Record<string, string>).NODE_ENV = "development";
  process.env.RATE_LIMIT_DISABLED = "0";
  process.env.RATE_LIMIT_LOGIN = "3";
  return keep;
});

import { api, CUSTOMER, expectError, type TestResponse } from "./helpers/http";

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else (process.env as Record<string, string>)[k] = v;
  }
});

const LOGIN = "/api/auth/login";
const badLogin = () => api().post(LOGIN, { identifier: "nobody@example.com", password: "wrong-password1" });
const header = (res: TestResponse, name: string) => [res.headers[name] ?? []].flat().join(", ");

describe("loginLimiter (RATE_LIMIT_LOGIN=3)", () => {
  it("does not count successful logins", async () => {
    for (let i = 0; i < 4; i++) {
      const ok = await api().post(LOGIN, { identifier: CUSTOMER.email, password: CUSTOMER.password });
      expect(ok.status).toBe(200);
      expect(header(ok, "ratelimit")).toContain(`"login"; r=2; t=`);
    }
  });

  it("counts failed logins and answers the 4th with 429 RATE_LIMITED plus draft-8 headers", async () => {
    for (let i = 1; i <= 3; i++) {
      const res = await badLogin();
      expectError(res, 401, "INVALID_CREDENTIALS");
      expect(header(res, "ratelimit")).toContain(`"login"; r=${3 - i}; t=`);
      expect(header(res, "ratelimit-policy")).toContain(`"login"; q=3; w=900`);
    }
    const blocked = await badLogin();
    const err = expectError(blocked, 429, "RATE_LIMITED");
    expect(err.message).toMatch(/too many requests/i);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(Number(blocked.headers["retry-after"])).toBeLessThanOrEqual(900);
    expect(header(blocked, "ratelimit")).toMatch(/"login"; r=0; t=\d+/);
    expect(header(blocked, "ratelimit-policy")).toContain(`"login"; q=3; w=900`);
    expect(blocked.headers["x-ratelimit-limit"]).toBeUndefined(); // legacy headers off

    // Even the right password is refused while blocked (the limiter runs first).
    expectError(await api().post(LOGIN, { identifier: CUSTOMER.email, password: CUSTOMER.password }), 429, "RATE_LIMITED");
  });

  it("does not share its counter with other limiters (signup / forgot-password still work)", async () => {
    const res = await api().post("/api/auth/forgot-password", { email: "someone@example.com" });
    expect(res.status).toBe(200);
    expect(header(res, "ratelimit")).toContain(`"sensitive"`);
  });

  it("the global api limiter reports its headers on every /api request", async () => {
    const res = await api().get("/api/health");
    expect(header(res, "ratelimit")).toMatch(/"api"; r=\d+; t=\d+/);
    expect(header(res, "ratelimit-policy")).toContain(`"api"; q=1000; w=900`);
    // ...including unknown paths (Express mounted apiLimiter on all of /api)
    expect(header(await api().get("/api/nope"), "ratelimit")).toMatch(/"api"; r=\d+/);
  });
});
