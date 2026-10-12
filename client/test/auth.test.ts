import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { db } from "./helpers/db";
import { createUser } from "./helpers/factories";
import { ADMIN, api, CUSTOMER, expectError, loginWith, newAgent } from "./helpers/http";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Session revocation compares whole seconds (JWT iat), so revocation tests wait past a second boundary. */
const nextSecond = () => sleep(1100);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const signupBody = (over: Record<string, unknown> = {}) => ({
  fullName: "Ananya Rao",
  email: `ananya.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`,
  mobile: `8${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
  password: "passw0rd1",
  ...over,
});

describe("signup", () => {
  it("rejects invalid fields with body.* validation details", async () => {
    const res = await api().post("/api/auth/signup", { fullName: "A", email: "nope", mobile: "12345", password: "short" });
    const err = expectError(res, 400, "VALIDATION_ERROR");
    const paths = err.details!.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["body.fullName", "body.email", "body.mobile", "body.password"]));
  });

  it("requires a letter and a number in the password", async () => {
    const err = expectError(await api().post("/api/auth/signup", signupBody({ password: "onlyletters" })), 400, "VALIDATION_ERROR");
    expect(err.details!.map((d) => d.path)).toContain("body.password");
  });

  it("creates a customer, lowercases the email and starts a session", async () => {
    const body = signupBody({ email: `MiXeD.${Date.now()}@Example.COM` });
    const agent = newAgent();
    const res = await api(agent).post("/api/auth/signup", body);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: body.email.toLowerCase(), role: "CUSTOMER", isActive: true });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=.*HttpOnly/i);
    expect((await api(agent).get("/api/auth/me")).body.user.id).toBe(res.body.user.id);
  });

  it("gives one generic 409 for a duplicate email or mobile, never naming the field", async () => {
    const first = signupBody();
    expect((await api().post("/api/auth/signup", first)).status).toBe(201);
    const dupEmail = await api().post("/api/auth/signup", signupBody({ email: first.email.toUpperCase() }));
    const dupMobile = await api().post("/api/auth/signup", signupBody({ mobile: first.mobile }));
    for (const res of [dupEmail, dupMobile]) {
      const err = expectError(res, 409, "CONFLICT");
      expect(err).toEqual({ message: "An account with these details already exists", code: "CONFLICT" });
    }
    expect(dupEmail.body).toEqual(dupMobile.body);
  });
});

describe("login", () => {
  it("logs in by email (case-insensitive) and by mobile", async () => {
    const user = await createUser();
    for (const identifier of [user.email.toUpperCase(), user.mobile]) {
      const res = await api().post("/api/auth/login", { identifier, password: user.password });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: user.id, email: user.email });
      expect(res.body.user.passwordHash).toBeUndefined();
    }
  });

  it("returns the same 401 body for a wrong password and an unknown user", async () => {
    const wrong = await api().post("/api/auth/login", { identifier: CUSTOMER.email, password: "wrong-password1" });
    const unknown = await api().post("/api/auth/login", { identifier: "nobody@example.com", password: "wrong-password1" });
    const unknownMobile = await api().post("/api/auth/login", { identifier: "9000000000", password: "wrong-password1" });
    expectError(wrong, 401, "INVALID_CREDENTIALS");
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(unknownMobile.body).toEqual(wrong.body);
    expect(wrong.body.error.message).toBe("Invalid credentials");
  });

  it("gives 403 ACCOUNT_DISABLED for a disabled user with the right password (401 with a wrong one)", async () => {
    const user = await createUser({ isActive: false });
    expectError(await api().post("/api/auth/login", { identifier: user.email, password: user.password }), 403, "ACCOUNT_DISABLED");
    expectError(await api().post("/api/auth/login", { identifier: user.email, password: "wrong-password1" }), 401, "INVALID_CREDENTIALS");
  });

  it("disabling a user ends their live session", async () => {
    const user = await createUser();
    const agent = await loginWith(user.email, user.password);
    expect((await api(agent).get("/api/auth/me")).status).toBe(200);
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    expectError(await api(agent).get("/api/auth/me"), 401, "UNAUTHENTICATED");
  });

  it("admin login rejects a customer with the generic 401 and accepts the admin", async () => {
    const res = await api().post("/api/auth/admin/login", { identifier: CUSTOMER.email, password: CUSTOMER.password });
    expectError(res, 401, "INVALID_CREDENTIALS");
    const wrong = await api().post("/api/auth/login", { identifier: CUSTOMER.email, password: "wrong-password1" });
    expect(res.body).toEqual(wrong.body);
    const ok = await api().post("/api/auth/admin/login", { identifier: ADMIN.email, password: ADMIN.password });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe("ADMIN");
  });

  it("/me without a session is 401, with a garbage token too", async () => {
    expectError(await api().get("/api/auth/me"), 401, "UNAUTHENTICATED");
    expectError(await api().get("/api/auth/me").set("Authorization", "Bearer not.a.jwt"), 401, "UNAUTHENTICATED");
  });

  it("logout clears the cookie", async () => {
    const user = await createUser();
    const agent = await loginWith(user.email, user.password);
    const res = await api(agent).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=;/);
    expect((await api(agent).get("/api/auth/me")).status).toBe(401);
  });
});

describe("change password", () => {
  it("revokes other sessions, keeps the caller logged in and swaps the password", async () => {
    const user = await createUser();
    const other = await loginWith(user.email, user.password);
    const me = await loginWith(user.email, user.password);
    await nextSecond();

    const wrong = await api(me).post("/api/users/me/change-password", { currentPassword: "not-it-123", newPassword: "another123" });
    expect(expectError(wrong, 400, "INVALID_PASSWORD").details?.[0].path).toBe("body.currentPassword");

    const res = await api(me).post("/api/users/me/change-password", { currentPassword: user.password, newPassword: "another123" });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^token=/);

    expectError(await api(other).get("/api/auth/me"), 401, "UNAUTHENTICATED");
    expect((await api(me).get("/api/auth/me")).status).toBe(200);
    expect((await api().post("/api/auth/login", { identifier: user.email, password: user.password })).status).toBe(401);
    expect((await api().post("/api/auth/login", { identifier: user.email, password: "another123" })).status).toBe(200);
  });
});

describe("password reset", () => {
  const infoSpy = () => vi.mocked(console.info);

  it("forgot-password always answers 200 with the same body", async () => {
    const user = await createUser();
    const known = await api().post("/api/auth/forgot-password", { email: user.email });
    const unknown = await api().post("/api/auth/forgot-password", { email: "ghost@example.com" });
    expect(known.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it("the emailed token works once, revokes sessions and cannot be replayed", async () => {
    const user = await createUser();
    const session = await loginWith(user.email, user.password);
    await nextSecond();

    infoSpy().mockClear();
    await api().post("/api/auth/forgot-password", { email: user.email });
    const mail = infoSpy().mock.calls.map((c) => String(c[0])).find((m) => m.includes(user.email));
    const token = /token=([a-f0-9]{64})/.exec(mail ?? "")?.[1];
    expect(token, "reset link in the console email").toBeDefined();

    const ok = await api().post("/api/auth/reset-password", { token, password: "resetPass9" });
    expect(ok.status).toBe(200);
    expectError(await api(session).get("/api/auth/me"), 401);

    const replay = await api().post("/api/auth/reset-password", { token, password: "resetPass10" });
    expectError(replay, 400, "INVALID_RESET_TOKEN");
    expect((await api().post("/api/auth/login", { identifier: user.email, password: "resetPass9" })).status).toBe(200);
  });

  it("rejects an expired token and burns other outstanding tokens on use", async () => {
    const user = await createUser();
    const expired = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(expired), expiresAt: new Date(Date.now() - 1000) } });
    expectError(await api().post("/api/auth/reset-password", { token: expired, password: "resetPass9" }), 400, "INVALID_RESET_TOKEN");

    const a = randomBytes(32).toString("hex");
    const b = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await db.passwordResetToken.createMany({ data: [{ userId: user.id, tokenHash: sha256(a), expiresAt }, { userId: user.id, tokenHash: sha256(b), expiresAt }] });
    expect((await api().post("/api/auth/reset-password", { token: a, password: "resetPass9" })).status).toBe(200);
    expectError(await api().post("/api/auth/reset-password", { token: b, password: "resetPass9" }), 400, "INVALID_RESET_TOKEN");
  });

  it("a malformed token is a validation error", async () => {
    const err = expectError(await api().post("/api/auth/reset-password", { token: "abc", password: "resetPass9" }), 400, "VALIDATION_ERROR");
    expect(err.details![0].path).toBe("body.token");
  });
});
