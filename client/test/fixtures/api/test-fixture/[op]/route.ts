// Throwaway, test-only Route Handler (never shipped: it lives outside src/app).
// test/helpers/router.ts mounts test/fixtures/api at /api, so this answers
// /api/test-fixture/<op>. Each op is one `route()` configuration that route.test.ts
// uses to exercise the wrapper itself (no real endpoint has that exact shape).
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/lib/prisma";
import { created, noContent, notFound, route, type RouteHandler } from "@/server/http/route";

const GET_OPS: Record<string, RouteHandler> = {
  me: route({ auth: "user" }, ({ user }) => ({ user })),
  admin: route({ auth: "admin" }, ({ user }) => ({ user })),
  optional: route({ auth: "optional" }, ({ user }) => ({ user: user ?? null })),
  decimal: route({}, () => ({ price: new Prisma.Decimal("1499.50"), lines: [{ total: new Prisma.Decimal("2.00") }], label: "x" })),
  cached: route({ auth: "optional", cache: "public" }, ({ user }) => ({ personalised: Boolean(user) })),
  "no-store": route({ auth: "user", cache: "no-store" }, () => ({ ok: true })),
  "record-not-found": route({}, async () => prisma.user.update({ where: { id: 0 }, data: { fullName: "nobody" } })),
  boom: route({}, () => {
    throw new Error("kaboom");
  }),
  csv: route({}, (ctx) => {
    ctx.setCookie("seen", "1", { path: "/" });
    return new Response("a,b\n1,2\n", { headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }),
  "zod-in-handler": route({}, () => z.object({ n: z.number() }).parse({ n: "x" })),
};

const POST_OPS: Record<string, RouteHandler> = {
  echo: route({ body: z.object({ name: z.string() }) }, ({ body, setStatus }) => {
    setStatus(201);
    return body;
  }),
  empty: route({}, ({ setStatus }) => {
    setStatus(204);
    return undefined;
  }),
  created: route({}, (ctx) => {
    ctx.setCookie("seen", "1", { path: "/" });
    return created({ price: new Prisma.Decimal("2.50") });
  }),
  "no-content": route({}, () => noContent()),
  /** P2002 on a primary key → no details (the column is not leaked). */
  "conflict-primary": route({ auth: "admin", body: z.object({ pincode: z.string() }) }, async ({ body }) =>
    prisma.serviceablePincode.create({ data: { pincode: body.pincode } }),
  ),
  /** rawBody leaves only multipart bodies unread; JSON is still parsed first (express.json before multer). */
  raw: route({ rawBody: true }, async ({ req, body }) => (req.bodyUsed ? { parsed: body } : { bytes: (await req.arrayBuffer()).byteLength })),
};

const dispatch =
  (ops: Record<string, RouteHandler>): RouteHandler =>
  async (req, ctx) => {
    const { op } = (await ctx.params) as { op: string };
    return (ops[op] ?? notFound)(req, ctx);
  };

export const GET = dispatch(GET_OPS);
export const POST = dispatch(POST_OPS);
