// In-process HTTP client for the Route Handlers (replaces supertest): resolves the
// path against src/app/api (test/helpers/router.ts), imports that route.ts, calls
// the exported METHOD with a real `Request` and `{ params: Promise.resolve(…) }`.
// The builder mimics the supertest calls the old suite used (.set, .type, .send,
// .field, .attach, await), so porting a test file is mostly mechanical:
//   request(app).post(p)  → newAgent().post(p)       request.agent(app) → newAgent()
//   api(agent), loginAs(), loginWith(), expectError() → unchanged
// Note: next.config.ts headers() (helmet-style security headers) are applied by the
// Next server, not here.
import { expect } from "vitest";
import { CLIENT_URL, TEST_ADMIN_PASSWORD } from "../env";
import { PathDecodeError, resolveRoute, type RouteMatch } from "./router";

export const ORIGIN = CLIENT_URL;
export const ADMIN = { email: "admin@labelapsare.com", password: TEST_ADMIN_PASSWORD };
export const CUSTOMER = { email: "customer@labelapsare.com", password: "Customer@123" };

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface TestResponse {
  status: number;
  /** Lower-case names; repeated headers joined with ", "; `set-cookie` is an array. */
  headers: Record<string, string | string[] | undefined>;
  /** Parsed JSON, or {} when the response isn't JSON (like supertest). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  text: string;
}

// ─── Cookie jar ─────────────────────────────────────────────────

export class CookieJar {
  private cookies = new Map<string, string>();

  /** Stores `Set-Cookie` values; an expired or Max-Age=0 cookie is removed. */
  store(setCookies: string[]): void {
    for (const line of setCookies) {
      const [pair, ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const attr = (key: string) => attrs.map((a) => a.trim()).find((a) => a.toLowerCase().startsWith(`${key}=`))?.split("=")[1];
      const maxAge = attr("max-age");
      const expires = attr("expires");
      const expired = (maxAge !== undefined && Number(maxAge) <= 0) || (expires !== undefined && new Date(expires).getTime() <= Date.now());
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    const v = this.cookies.get(name);
    return v === undefined ? undefined : decodeURIComponent(v);
  }

  header(): string | undefined {
    return this.cookies.size ? [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ") : undefined;
  }
}

// ─── Low-level request ──────────────────────────────────────────

export interface RequestOptions {
  /** Object/array → JSON (Content-Type application/json unless set); string, FormData, Buffer → as is. */
  body?: unknown;
  headers?: Record<string, string>;
  cookieJar?: CookieJar;
}

/** Calls the Route Handler that `path` resolves to. No match → 404 with an empty body (Next's HTML 404); a malformed %-escape in a param → Next's plain 500. */
export async function request(method: Method, path: string, opts: RequestOptions = {}): Promise<TestResponse> {
  const url = new URL(path, CLIENT_URL);
  const headers = new Headers(opts.headers);
  const cookie = opts.cookieJar?.header();
  if (cookie && !headers.has("cookie")) headers.set("Cookie", cookie);

  let body: BodyInit | undefined;
  const b = opts.body;
  if (b instanceof FormData || b === undefined) body = b;
  else if (typeof b === "string" || b instanceof Uint8Array) {
    body = typeof b === "string" ? b : new Uint8Array(b);
    headers.set("Content-Length", String(typeof b === "string" ? Buffer.byteLength(b) : b.byteLength));
  } else {
    body = JSON.stringify(b);
    if (!headers.has("content-type")) headers.set("Content-Type", "application/json");
    headers.set("Content-Length", String(Buffer.byteLength(body)));
  }
  if (method === "GET" || method === "HEAD") body = undefined;

  const req = new Request(url, { method, headers, body });
  let match: RouteMatch | null = null;
  let badPath = false;
  try {
    match = resolveRoute(url.pathname);
  } catch (e) {
    if (!(e instanceof PathDecodeError)) throw e;
    badPath = true;
  }
  let res: Response;
  if (badPath) {
    res = new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } }); // next start on a DecodeError
  } else if (!match) {
    res = new Response(null, { status: 404 });
  } else {
    const mod = (await import(/* @vite-ignore */ match.file)) as Record<string, unknown>;
    const ctx = { params: Promise.resolve(match.params) };
    type Fn = (req: Request, ctx: unknown) => Promise<Response>;
    const fn = mod[method] as Fn | undefined;
    if (fn) res = await fn(req, ctx);
    else if (method === "HEAD" && mod.GET) {
      const full = await (mod.GET as Fn)(new Request(url, { method: "GET", headers }), ctx);
      res = new Response(null, { status: full.status, headers: full.headers });
    } else if (method === "OPTIONS") {
      const allow = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"].filter((m) => mod[m] || (m === "HEAD" && mod.GET) || m === "OPTIONS");
      res = new Response(null, { status: 204, headers: { Allow: allow.join(", ") } });
    } else res = new Response(null, { status: 405 });
  }

  const setCookies = res.headers.getSetCookie();
  opts.cookieJar?.store(setCookies);
  const out: TestResponse["headers"] = {};
  res.headers.forEach((value, key) => {
    if (key !== "set-cookie") out[key] = value;
  });
  if (setCookies.length) out["set-cookie"] = setCookies;
  const text = await res.text();
  const isJson = /application\/json/.test(res.headers.get("content-type") ?? "");
  return { status: res.status, headers: out, body: isJson && text ? JSON.parse(text) : {}, text };
}

// ─── supertest-style builder ────────────────────────────────────

const TYPES: Record<string, string> = { json: "application/json", form: "application/x-www-form-urlencoded", text: "text/plain" };

export class TestRequest implements PromiseLike<TestResponse> {
  private headers: Record<string, string> = {};
  private body: unknown;
  private form?: FormData;

  constructor(
    private method: Method,
    private path: string,
    private jar?: CookieJar,
  ) {}

  set(name: string | Record<string, string>, value?: string): this {
    if (typeof name === "string") this.headers[name] = value!;
    else Object.assign(this.headers, name);
    return this;
  }

  type(type: string): this {
    return this.set("Content-Type", TYPES[type] ?? type);
  }

  /** Object → JSON; a string without a Content-Type is sent form-encoded (superagent's default). */
  send(body: unknown): this {
    if (typeof body === "string" && !Object.keys(this.headers).some((h) => h.toLowerCase() === "content-type")) this.type("form");
    this.body = body;
    return this;
  }

  /** multipart/form-data text field. */
  field(name: string, value: string): this {
    (this.form ??= new FormData()).append(name, value);
    return this;
  }

  /** multipart/form-data file. */
  attach(field: string, content: Buffer | Uint8Array, file: string | { filename: string; contentType?: string }): this {
    const { filename, contentType } = typeof file === "string" ? { filename: file, contentType: undefined } : file;
    (this.form ??= new FormData()).append(field, new Blob([new Uint8Array(content)], { type: contentType ?? "application/octet-stream" }), filename);
    return this;
  }

  then<R1 = TestResponse, R2 = never>(
    onfulfilled?: ((value: TestResponse) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return request(this.method, this.path, { headers: this.headers, body: this.form ?? this.body, cookieJar: this.jar }).then(onfulfilled, onrejected);
  }
}

export interface Agent {
  jar: CookieJar;
  get(path: string): TestRequest;
  post(path: string): TestRequest;
  put(path: string): TestRequest;
  patch(path: string): TestRequest;
  delete(path: string): TestRequest;
  head(path: string): TestRequest;
  options(path: string): TestRequest;
}

/** A fresh cookie jar (anonymous until it logs in). Replaces `request(app)` and `request.agent(app)`. */
export function newAgent(): Agent {
  const jar = new CookieJar();
  const at = (method: Method) => (path: string) => new TestRequest(method, path, jar);
  return { jar, get: at("GET"), post: at("POST"), put: at("PUT"), patch: at("PATCH"), delete: at("DELETE"), head: at("HEAD"), options: at("OPTIONS") };
}

/**
 * Same-origin JSON client: every request carries `Origin: http://localhost:3000`
 * and bodies are sent as JSON. Pass an agent to reuse its session cookie.
 */
export function api(agent: Agent = newAgent()) {
  const call = (method: "get" | "post" | "put" | "patch" | "delete") => (url: string, body?: unknown) => {
    const req = agent[method](url).set("Origin", ORIGIN).set("Accept", "application/json");
    return body === undefined ? req : req.send(body);
  };
  return { get: call("get"), post: call("post"), put: call("put"), patch: call("patch"), delete: call("delete"), agent };
}
export type Api = ReturnType<typeof api>;

/** Logs in through a real endpoint and returns an agent carrying the session cookie. */
export async function loginWith(identifier: string, password: string, path = "/api/auth/login"): Promise<Agent> {
  const agent = newAgent();
  const res = await api(agent).post(path, { identifier, password });
  expect(res.status, `login ${identifier}: ${JSON.stringify(res.body)}`).toBe(200);
  return agent;
}

export function loginAs(who: "admin" | "customer"): Promise<Agent> {
  return who === "admin" ? loginWith(ADMIN.email, ADMIN.password, "/api/auth/admin/login") : loginWith(CUSTOMER.email, CUSTOMER.password);
}

/**
 * Asserts the one error shape `{ error: { message, code, details? } }` (and no
 * stack trace anywhere in the body). Returns the error for further checks.
 */
export function expectError(res: TestResponse, status: number, code?: string) {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.headers["content-type"]).toMatch(/application\/json/);
  expect(Object.keys(res.body)).toEqual(["error"]);
  const { error } = res.body as { error: Record<string, unknown> };
  expect(typeof error.message).toBe("string");
  expect(typeof error.code).toBe("string");
  for (const key of Object.keys(error)) expect(["message", "code", "details"]).toContain(key);
  if (error.details !== undefined) {
    expect(Array.isArray(error.details)).toBe(true);
    for (const d of error.details as { path: unknown; message: unknown }[]) {
      expect(typeof d.path).toBe("string");
      expect(typeof d.message).toBe("string");
    }
  }
  expect(res.text).not.toMatch(/\bat .+\.(ts|js):\d+|"stack"/);
  if (code) expect(error.code).toBe(code);
  return error as { message: string; code: string; details?: { path: string; message: string }[] };
}
