// Express behaviour the route() wrapper reproduces beyond the per-module suites:
// res.json's weak ETag + 304, body-parser's charset / Content-Encoding handling,
// express.json running before the uploads router's auth, and percent-encoded params.
import { createHash } from "node:crypto";
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { checkout, shopper } from "./helpers/checkout";
import { createAddress, createProduct } from "./helpers/factories";
import { api, expectError, loginAs, newAgent, ORIGIN, type Api, type TestResponse } from "./helpers/http";

/** What the `etag` package returns for a body with `{ weak: true }`. */
const expressEtag = (body: string) =>
  `W/"${Buffer.byteLength(body).toString(16)}-${createHash("sha1").update(body).digest("base64").slice(0, 27)}"`;

const conditional = (client: Api, path: string, etag: string) => client.agent.get(path).set("Origin", ORIGIN).set("If-None-Match", etag);

async function expectEtagRoundTrip(client: Api, path: string): Promise<TestResponse> {
  const first = await client.get(path);
  expect(first.status, first.text).toBe(200);
  expect(first.headers.etag).toBe(expressEtag(first.text));

  const again = await conditional(client, path, first.headers.etag as string);
  expect(again.status).toBe(304);
  expect(again.text).toBe("");
  expect(again.headers.etag).toBe(first.headers.etag);
  expect(again.headers["content-type"]).toBeUndefined();
  // Everything else set before the send survives (Express `fresh` only strips the entity headers).
  expect(again.headers["cache-control"]).toBe(first.headers["cache-control"]);
  expect(again.headers.vary).toBe(first.headers.vary);
  return first;
}

describe("ETag / 304 (Express res.json default weak ETag + req.fresh)", () => {
  it("GET /api/auth/me", async () => {
    await expectEtagRoundTrip(api(await loginAs("customer")), "/api/auth/me");
  });

  it("GET /api/products keeps Cache-Control and Vary on the 304", async () => {
    const first = await expectEtagRoundTrip(api(), "/api/products?limit=2");
    expect(first.headers["cache-control"]).toMatch(/^public/);
    expect(first.headers.vary).toBe("Cookie, Authorization");
  });

  it("GET /api/addresses", async () => {
    const { api: client, user } = await shopper();
    await createAddress(user.id);
    const first = await expectEtagRoundTrip(client, "/api/addresses");
    expect(first.body.items).toHaveLength(1);
  });

  it("GET /api/cart keeps its private, no-store on the 304", async () => {
    const { api: client } = await shopper();
    const first = await expectEtagRoundTrip(client, "/api/cart");
    expect(first.headers["cache-control"]).toBe("private, no-store");
  });

  it("If-None-Match matching: list, strong form, `*`; stale on a mismatch or Cache-Control: no-cache", async () => {
    const first = await api().get("/api/health");
    const tag = first.headers.etag as string;
    const status = async (inm: string, extra: Record<string, string> = {}) =>
      (await newAgent().get("/api/health").set({ "If-None-Match": inm, ...extra })).status;
    expect(await status(`"nope", ${tag}`)).toBe(304);
    expect(await status(tag.slice(2))).toBe(304); // strong form of the weak tag
    expect(await status("*")).toBe(304);
    expect(await status('W/"0-nope"')).toBe(200);
    expect(await status(tag, { "Cache-Control": "no-cache" })).toBe(200);
  });

  it("errors and non-GET bodies are tagged too, but only GET/HEAD 2xx become 304", async () => {
    const missing = await api().get("/api/nope");
    expect(missing.headers.etag).toBe(expressEtag(missing.text));
    expect((await conditional(api(), "/api/nope", missing.headers.etag as string)).status).toBe(404);

    const posted = await api().post("/api/test-fixture/echo", { name: "a" });
    expect(posted.status).toBe(201);
    expect(posted.headers.etag).toBe(expressEtag(posted.text));
    const repeat = await newAgent().post("/api/test-fixture/echo").set({ Origin: ORIGIN, "If-None-Match": posted.headers.etag as string }).send({ name: "a" });
    expect(repeat.status).toBe(201);

    // 204 and handler-built Responses (CSV) have no ETag, as res.end()/streams had none.
    expect((await api().post("/api/test-fixture/no-content")).headers.etag).toBeUndefined();
    expect((await api().get("/api/test-fixture/csv")).headers.etag).toBeUndefined();
    // ...and are never turned into a 304: Express streamed them past res.send's freshness check.
    const csv = await api().get("/api/test-fixture/csv").set("If-None-Match", "*");
    expect(csv.status).toBe(200);
    expect(csv.text.length).toBeGreaterThan(0);
  });
});

// ─── express.json(): charset and Content-Encoding (body-parser 2.x) ──

const ECHO = "/api/test-fixture/echo";
const JSON_BODY = '{"name":"a"}';
const post = (body: string | Buffer, headers: Record<string, string>) =>
  newAgent().post(ECHO).set({ Origin: ORIGIN, "Content-Type": "application/json", ...headers }).send(body);

describe("JSON body charset (body-parser: only utf-* charsets)", () => {
  it("415 for a non-utf charset, with body-parser's message and the default code", async () => {
    const err = expectError(await post(JSON_BODY, { "Content-Type": "application/json; charset=latin1" }), 415, "ERROR");
    expect(err.message).toBe('unsupported charset "LATIN1"');
    // `utf8` doesn't start with `utf-` either; an unknown utf-* label is 415 as well.
    expect(expectError(await post(JSON_BODY, { "Content-Type": "application/json; charset=utf8" }), 415).message).toBe('unsupported charset "UTF8"');
    expect(expectError(await post(JSON_BODY, { "Content-Type": "application/json; charset=utf-bogus" }), 415).message).toBe('unsupported charset "UTF-BOGUS"');
  });

  it("accepts utf-8 in any case, quoted, with a BOM, and utf-16le/be", async () => {
    expect((await post(JSON_BODY, { "Content-Type": 'application/json; charset="UTF-8"' })).body).toEqual({ name: "a" });
    expect((await post(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON_BODY)]), {})).body).toEqual({ name: "a" });
    expect((await post(Buffer.from(JSON_BODY, "utf16le"), { "Content-Type": "application/json; charset=utf-16le" })).body).toEqual({ name: "a" });
    expect((await post(Buffer.from(JSON_BODY, "utf16le").swap16(), { "Content-Type": "application/json; charset=utf-16be" })).body).toEqual({ name: "a" });
  });

  it("the charset is checked before the size (a 415, not a 413)", async () => {
    const big = JSON.stringify({ name: "x".repeat(1024 * 1024) });
    expectError(await post(big, { "Content-Type": "application/json; charset=latin1" }), 415);
    expectError(await post(big, {}), 413, "PAYLOAD_TOO_LARGE");
  });
});

describe("JSON body Content-Encoding (body-parser: identity, deflate, gzip, br)", () => {
  it("inflates gzip, deflate and br (any case); identity is plain", async () => {
    for (const [encoding, body] of [
      ["gzip", gzipSync(JSON_BODY)],
      ["GZIP", gzipSync(JSON_BODY)],
      ["deflate", deflateSync(JSON_BODY)],
      ["br", brotliCompressSync(JSON_BODY)],
      ["identity", Buffer.from(JSON_BODY)],
    ] as const) {
      const res = await post(body, { "Content-Encoding": encoding });
      expect(res.status, `${encoding}: ${res.text}`).toBe(201);
      expect(res.body).toEqual({ name: "a" });
    }
    // An empty gzip stream is an empty body → {} (then the schema's 400).
    expect(expectError(await post(gzipSync(""), { "Content-Encoding": "gzip" }), 400, "VALIDATION_ERROR").details![0].path).toBe("body.name");
  });

  it("415 for an unknown encoding (after the charset check)", async () => {
    expect(expectError(await post(JSON_BODY, { "Content-Encoding": "xz" }), 415, "ERROR").message).toBe('unsupported content encoding "xz"');
    expect(expectError(await post(JSON_BODY, { "Content-Encoding": "gzip, br" }), 415).message).toBe('unsupported content encoding "gzip, br"');
    expect(expectError(await post(JSON_BODY, { "Content-Type": "application/json; charset=latin1", "Content-Encoding": "xz" }), 415).message).toBe(
      'unsupported charset "LATIN1"',
    );
  });

  it("400 with zlib's message for a corrupt stream; 413 when the inflated size passes 1 MB", async () => {
    expect(expectError(await post(JSON_BODY, { "Content-Encoding": "gzip" }), 400, "BAD_REQUEST").message).toBe("incorrect header check");
    const bomb = gzipSync(JSON.stringify({ name: "x".repeat(1024 * 1024) }));
    expect(bomb.length).toBeLessThan(10_000);
    expect(expectError(await post(bomb, { "Content-Encoding": "gzip" }), 413, "PAYLOAD_TOO_LARGE").message).toBe("request entity too large");
    // Bad JSON inside a valid gzip stream is the usual strict-parse 400.
    expectError(await post(gzipSync("{bad"), { "Content-Encoding": "gzip" }), 400, "BAD_REQUEST");
  });
});

describe("POST /api/uploads/image with a JSON body (express.json ran before requireAuth)", () => {
  const upload = (body: string) => newAgent().post("/api/uploads/image").set({ Origin: ORIGIN, "Content-Type": "application/json" }).send(body);

  it("bad JSON → 400 and oversized JSON → 413, before the guest's 401", async () => {
    expectError(await upload("{bad"), 400, "BAD_REQUEST");
    expectError(await upload(JSON.stringify({ x: "y".repeat(1024 * 1024) })), 413, "PAYLOAD_TOO_LARGE");
    expectError(await upload("{}"), 401, "UNAUTHENTICATED");
  });

  it("an admin's valid JSON body reaches the handler (no files → 400)", async () => {
    const admin = api(await loginAs("admin"));
    expectError(await admin.post("/api/uploads/image", { files: [] }), 400);
  });
});

// ─── Percent-encoded dynamic segments (Next: split on "/", then decodeURIComponent) ──

const encodeAll = (s: string) => [...Buffer.from(s)].map((b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join("");

describe("percent-encoded params", () => {
  it("an encoded order number resolves to the same order", async () => {
    const { api: client, user } = await shopper();
    const p = await createProduct();
    const order = await checkout(client, user.id, [{ variantId: p.variants[0].id }]);
    const res = await client.get(`/api/orders/${encodeAll(order.orderNumber)}`);
    expect(res.status, res.text).toBe(200);
    expect(res.body.orderNumber).toBe(order.orderNumber);
    // `%2F` stays inside the one segment and decodes to "/" (Express did the same): the
    // [orderNumber] route answers (not the orders/[...slug] catch-all's "Route not found").
    const slash = expectError(await client.get(`/api/orders/${order.orderNumber.slice(0, 4)}%2F${order.orderNumber.slice(4)}`), 404, "NOT_FOUND");
    expect(slash.message).toBe("Order not found");
  });

  it("an encoded slug resolves to the product; an encoded static name is a param; a malformed escape is Next's 500", async () => {
    const p = await createProduct();
    const res = await api().get(`/api/products/${encodeAll(p.slug)}`);
    expect(res.status, res.text).toBe(200);
    expect(res.body.slug).toBe(p.slug);
    expect((await api().get(`/api/products/${encodeURIComponent(p.slug)}/similar`)).status).toBe(200);
    // Static folders match the raw segment (next start): `hom%65` is the slug "home", not products/home.
    expect(expectError(await api().get("/api/products/hom%65"), 404, "NOT_FOUND").message).toBe("Product not found");
    // Next answers a malformed escape with a plain-text 500 (Express: 400 JSON; accepted gap, MIGRATION.md).
    expect((await api().get("/api/products/%E0%A4%A")).status).toBe(500);
  });
});
