import { beforeAll, describe, expect, it } from "vitest";
import { db } from "./helpers/db";
import { createAddress, createUser } from "./helpers/factories";
import { api, expectError, loginWith, type Api } from "./helpers/http";

const body = (over: Record<string, unknown> = {}) => ({
  fullName: "Ananya Rao", mobile: "9876500000", line1: "12 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", ...over,
});

let me: Api;
let myId: number;

beforeAll(async () => {
  const user = await createUser();
  myId = user.id;
  me = api(await loginWith(user.email, user.password));
});

const defaults = async (userId: number) => (await db.address.findMany({ where: { userId, isDefault: true } })).map((a) => a.id);

describe("addresses", () => {
  it("the first address becomes the default even when isDefault is false", async () => {
    const res = await me.post("/api/addresses", body({ isDefault: false, line2: "", landmark: null }));
    expect(res.status).toBe(201);
    expect(res.body.address).toMatchObject({ isDefault: true, line2: null, landmark: null });
    expect(await defaults(myId)).toEqual([res.body.address.id]);
  });

  it("keeps exactly one default: isDefault true moves it, isDefault false is ignored", async () => {
    const second = (await me.post("/api/addresses", body({ line1: "Second", isDefault: true }))).body.address;
    expect(await defaults(myId)).toEqual([second.id]);

    const third = (await me.post("/api/addresses", body({ line1: "Third" }))).body.address;
    expect(third.isDefault).toBe(false);

    const unset = await me.patch(`/api/addresses/${second.id}`, { isDefault: false });
    expect(unset.status).toBe(200);
    expect(await defaults(myId)).toEqual([second.id]);

    const moved = await me.patch(`/api/addresses/${third.id}/default`);
    expect(moved.body.address.isDefault).toBe(true);
    expect(await defaults(myId)).toEqual([third.id]);

    const list = (await me.get("/api/addresses")).body.items;
    expect(list[0].id).toBe(third.id); // default first
  });

  it("deleting the default promotes the newest remaining address", async () => {
    const [current] = await defaults(myId);
    const newest = await db.address.findFirst({ where: { userId: myId, id: { not: current } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    expect((await me.delete(`/api/addresses/${current}`)).status).toBe(204);
    expect(await defaults(myId)).toEqual([newest!.id]);
  });

  it("another user's address is a 404, exactly like a missing one (no IDOR)", async () => {
    const other = await createUser();
    const theirs = await createAddress(other.id);
    const missing = await me.patch("/api/addresses/99999999", { city: "X" });
    expectError(missing, 404, "NOT_FOUND");
    for (const res of [
      await me.patch(`/api/addresses/${theirs.id}`, { city: "Hacked" }),
      await me.patch(`/api/addresses/${theirs.id}/default`),
      await me.delete(`/api/addresses/${theirs.id}`),
    ]) {
      expectError(res, 404, "NOT_FOUND");
      expect(res.body).toEqual(missing.body);
    }
    const after = await db.address.findUniqueOrThrow({ where: { id: theirs.id } });
    expect(after).toMatchObject({ city: "Bengaluru", isDefault: true });
    expect((await me.get("/api/addresses")).body.items.map((a: { id: number }) => a.id)).not.toContain(theirs.id);
  });

  it("validates the body and the id", async () => {
    const err = expectError(await me.post("/api/addresses", body({ pincode: "5600", mobile: "12" })), 400, "VALIDATION_ERROR");
    expect(err.details!.map((d) => d.path)).toEqual(expect.arrayContaining(["body.pincode", "body.mobile"]));
    expect(expectError(await me.patch("/api/addresses/abc", { city: "X" }), 400, "VALIDATION_ERROR").details![0].path).toBe("params.id");
    expectError(await me.patch(`/api/addresses/1`, {}), 400, "VALIDATION_ERROR");
  });

  it("needs a session", async () => {
    expectError(await api().get("/api/addresses"), 401, "UNAUTHENTICATED");
  });
});
